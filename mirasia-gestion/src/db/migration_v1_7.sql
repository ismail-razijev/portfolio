-- Migration v1.7 : fiabilise fn_enregistrer_vente face aux ventes simultanees.
--
-- Probleme corrige
-- ----------------
-- La fonction verifiait le stock disponible avec un SELECT SUM(...) SANS verrou,
-- puis decrementait dans une boucle FOR UPDATE. Entre les deux, une autre
-- transaction pouvait consommer le meme stock.
--
-- Scenario : stock = 10, deux ventes de 6 lancees en meme temps.
--   T1 lit 10, passe le controle.
--   T2 lit 10, passe le controle aussi.
--   T1 prend le verrou et deduit 6, il reste 4.
--   T2 obtient le verrou, ne trouve plus que 4 unites, en deduit 4...
--   ... et sort de la boucle avec v_reste = 2, sans rien signaler.
--
-- La contrainte CHECK (quantite >= 0) ne protege pas de ce cas : LEAST() empeche
-- de passer sous zero, donc aucune erreur n'est levee. La commande est pourtant
-- enregistree pour 6 unites alors que 4 seulement ont quitte le stock. L'ecart
-- ne se voit qu'a l'inventaire, sans trace de son origine.
--
-- Correction : apres la boucle, exiger que tout ait ete deduit. Une exception
-- dans une fonction PL/pgSQL annule la transaction entiere, donc la commande
-- n'est pas creee et le client recoit un message clair plutot qu'un faux succes.
--
-- Le reste de la fonction est inchange.

CREATE OR REPLACE FUNCTION fn_enregistrer_vente(p_id_plat INTEGER, p_quantite INTEGER)
RETURNS commandes AS $$
DECLARE
    v_stock_disponible INTEGER;
    v_prix NUMERIC(6,2);
    v_reste INTEGER := p_quantite;
    v_ligne RECORD;
    v_a_retirer INTEGER;
    v_commande commandes;
BEGIN
    IF p_quantite IS NULL OR p_quantite <= 0 THEN
        RAISE EXCEPTION 'La quantité doit être positive.';
    END IF;

    SELECT COALESCE(SUM(quantite), 0) INTO v_stock_disponible
    FROM stock WHERE id_plat = p_id_plat;

    -- Controle immediat, pour renvoyer tout de suite un message utile dans le
    -- cas courant. Il ne suffit pas a lui seul : voir la verification finale.
    IF v_stock_disponible < p_quantite THEN
        RAISE EXCEPTION 'Stock insuffisant : % disponible(s), % demandé(s).',
            v_stock_disponible, p_quantite;
    END IF;

    SELECT prix INTO v_prix FROM plats WHERE id = p_id_plat;

    FOR v_ligne IN
        SELECT id, quantite FROM stock
        WHERE id_plat = p_id_plat AND quantite > 0
        ORDER BY date_preparation ASC
        FOR UPDATE
    LOOP
        EXIT WHEN v_reste <= 0;
        v_a_retirer := LEAST(v_ligne.quantite, v_reste);
        UPDATE stock SET quantite = quantite - v_a_retirer WHERE id = v_ligne.id;
        v_reste := v_reste - v_a_retirer;
    END LOOP;

    -- Filet de securite : ici, les lignes de stock ont ete verrouillees, donc
    -- ce qui n'a pas pu etre deduit ne le sera pas davantage en reessayant dans
    -- la meme transaction. Si un reliquat subsiste, une vente concurrente est
    -- passee entre le controle initial et le verrou : on refuse la vente
    -- entiere plutot que d'enregistrer une commande a moitie servie.
    IF v_reste > 0 THEN
        RAISE EXCEPTION
            'Stock insuffisant : % unité(s) sur % n''ont pas pu être déduites, une autre vente est passée entre-temps. Vente annulée, réessayez.',
            v_reste, p_quantite;
    END IF;

    INSERT INTO commandes (id_plat, quantite, prix_unitaire)
    VALUES (p_id_plat, p_quantite, v_prix)
    RETURNING * INTO v_commande;

    RETURN v_commande;
END;
$$ LANGUAGE plpgsql;
