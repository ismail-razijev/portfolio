-- Migration V1.2 : module Ventes/Commandes

CREATE TABLE commandes (
    id SERIAL PRIMARY KEY,
    id_plat INTEGER NOT NULL REFERENCES plats(id),
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire NUMERIC(6,2),
    date_commande TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fonction PL/pgSQL : enregistre une vente et décrémente le stock automatiquement.
-- Stratégie FIFO : on retire d'abord des lots préparés le plus tôt (les plus proches
-- de la péremption), comme le ferait un vrai restaurant avec des plats surgelés.
-- Tout se passe dans une seule transaction : si le stock est insuffisant, rien n'est modifié.
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

    INSERT INTO commandes (id_plat, quantite, prix_unitaire)
    VALUES (p_id_plat, p_quantite, v_prix)
    RETURNING * INTO v_commande;

    RETURN v_commande;
END;
$$ LANGUAGE plpgsql;
