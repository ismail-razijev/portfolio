-- Migration V1.3 : carte du restaurant, commande client, cuisine/salle, réservations
--
-- Ce module est indépendant du stock surgelé existant (stock, commandes,
-- fn_enregistrer_vente) : les commandes client ne décrémentent pas ce stock,
-- ce sont deux pipelines séparés qui partagent seulement la table `plats`.

-- Catégories de la carte (distinctes de `cuisines`, qui reste utilisée par le
-- module stock surgelé pour l'origine du plat : ouïghour, kazakh, etc.)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE,
    ordre_affichage INTEGER NOT NULL DEFAULT 0
);

-- Extension de `plats` pour la carte du restaurant. id_cuisine et id_categorie
-- sont tous les deux nullables et indépendants : un plat du stock surgelé n'a
-- pas forcément de catégorie, un plat de la carte n'a pas forcément de cuisine.
ALTER TABLE plats ADD COLUMN id_categorie INTEGER REFERENCES categories(id);
ALTER TABLE plats ADD COLUMN description TEXT;
ALTER TABLE plats ADD COLUMN vegetarien VARCHAR(10) NOT NULL DEFAULT 'non'
    CHECK (vegetarien IN ('non', 'oui', 'option'));
ALTER TABLE plats ADD COLUMN disponibilite BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE plats ADD COLUMN sur_commande BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plats ADD COLUMN unite VARCHAR(10) NOT NULL DEFAULT 'plat'
    CHECK (unite IN ('plat', 'piece'));

COMMENT ON COLUMN plats.disponibilite IS
    'Rupture temporaire (plusieurs fois par service), distinct de actif (retrait durable de la carte)';
COMMENT ON COLUMN plats.sur_commande IS
    'Plats "Jeudis Gourmands" : uniquement disponibles sur réservation, voir fn_creer_commande_client';

-- Variantes de prix (poulet/bœuf/parfum, etc.). Texte libre plutôt qu'un enum
-- Postgres pour ne pas nécessiter d'ALTER TYPE à chaque nouvelle variante.
CREATE TABLE variantes (
    id SERIAL PRIMARY KEY,
    id_plat INTEGER NOT NULL REFERENCES plats(id) ON DELETE CASCADE,
    nom VARCHAR(50) NOT NULL,
    prix NUMERIC(6,2) NOT NULL CHECK (prix >= 0),
    actif BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (id_plat, nom)
);

-- Tables du restaurant (nommée tables_salle pour éviter la confusion avec le
-- mot-clé SQL "table" dans le code applicatif).
CREATE TABLE tables_salle (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,
    capacite INTEGER NOT NULL DEFAULT 4 CHECK (capacite > 0),
    statut VARCHAR(20) NOT NULL DEFAULT 'libre'
        CHECK (statut IN ('libre', 'occupee', 'reservee'))
);

-- Commandes client (sur place / à emporter), pipeline séparé de `commandes`
-- (stock surgelé). Couvre aussi les pré-commandes Jeudis Gourmands : ce sont
-- des commandes normales dont une ligne référence un plat sur_commande=true,
-- avec date_prevue renseignée (voir fn_creer_commande_client).
CREATE TABLE commandes_client (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('sur_place', 'a_emporter')),
    id_table INTEGER REFERENCES tables_salle(id),
    statut VARCHAR(20) NOT NULL DEFAULT 'recu'
        CHECK (statut IN ('recu', 'en_preparation', 'pret', 'servi', 'annule')),
    nom_client VARCHAR(100),
    telephone_client VARCHAR(30),
    date_commande TIMESTAMP NOT NULL DEFAULT NOW(),
    date_prevue DATE,
    total NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    CONSTRAINT commandes_client_table_coherente CHECK (
        (mode = 'sur_place' AND id_table IS NOT NULL) OR
        (mode = 'a_emporter' AND id_table IS NULL)
    )
);

CREATE TABLE commande_lignes (
    id SERIAL PRIMARY KEY,
    id_commande INTEGER NOT NULL REFERENCES commandes_client(id) ON DELETE CASCADE,
    id_plat INTEGER NOT NULL REFERENCES plats(id),
    id_variante INTEGER REFERENCES variantes(id),
    quantite INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire NUMERIC(6,2) NOT NULL CHECK (prix_unitaire >= 0),
    option_vegetarien BOOLEAN NOT NULL DEFAULT false,
    commentaire VARCHAR(200)
);

CREATE INDEX idx_commande_lignes_commande ON commande_lignes(id_commande);
CREATE INDEX idx_commandes_client_statut ON commandes_client(statut);
CREATE INDEX idx_commandes_client_date ON commandes_client(date_commande);

-- Réservations de table, distinctes des pré-commandes Jeudis Gourmands.
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    nom_client VARCHAR(100) NOT NULL,
    telephone_client VARCHAR(30) NOT NULL,
    date_reservation DATE NOT NULL,
    heure_reservation TIME NOT NULL,
    nb_personnes INTEGER NOT NULL CHECK (nb_personnes > 0),
    id_table INTEGER REFERENCES tables_salle(id),
    statut VARCHAR(20) NOT NULL DEFAULT 'en_attente'
        CHECK (statut IN ('en_attente', 'confirmee', 'annulee')),
    commentaire VARCHAR(200),
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservations_date ON reservations(date_reservation);

-- Fonction PL/pgSQL : crée une commande client avec toutes ses lignes en une
-- seule transaction (même esprit que fn_enregistrer_vente : tout ou rien,
-- prix toujours recalculés côté serveur, jamais fournis par le client).
--
-- p_lignes est un tableau JSON : [{"id_plat":1,"id_variante":null,"quantite":2,
-- "option_vegetarien":false,"commentaire":null}, ...]
--
-- Règle Jeudis Gourmands : si une ligne référence un plat sur_commande=true,
-- la date de retrait est calculée ici (le prochain jeudi, pas un jeudi choisi
-- librement par le client) et comparée au mercredi 22h00 précédent. Cette
-- règle est volontairement procédurale plutôt qu'une CHECK sur la table : une
-- CHECK utilisant now() se réévaluerait à chaque UPDATE (y compris les
-- changements de statut faits par la cuisine après coup), ce qui bloquerait
-- des mises à jour légitimes une fois l'heure de coupure dépassée.
CREATE OR REPLACE FUNCTION fn_creer_commande_client(
    p_mode VARCHAR,
    p_id_table INTEGER,
    p_nom_client VARCHAR,
    p_telephone_client VARCHAR,
    p_lignes JSONB
) RETURNS commandes_client AS $$
DECLARE
    v_commande commandes_client;
    v_ligne JSONB;
    v_plat plats;
    v_variante variantes;
    v_id_variante INTEGER;
    v_prix NUMERIC(6,2);
    v_quantite INTEGER;
    v_total NUMERIC(8,2) := 0;
    v_prochain_jeudi DATE;
    v_coupure TIMESTAMP;
    v_date_prevue DATE := NULL;
BEGIN
    IF p_lignes IS NULL OR jsonb_array_length(p_lignes) = 0 THEN
        RAISE EXCEPTION 'La commande doit contenir au moins un article.';
    END IF;

    -- Le prochain jeudi (aujourd'hui exclu : un plat Jeudis Gourmands se
    -- prépare toujours à l'avance, pas le jour même).
    v_prochain_jeudi := CURRENT_DATE + (((4 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 7 - 1) % 7) + 1);
    v_coupure := (v_prochain_jeudi - INTERVAL '1 day') + INTERVAL '22 hours';

    INSERT INTO commandes_client (mode, id_table, nom_client, telephone_client)
    VALUES (p_mode, p_id_table, p_nom_client, p_telephone_client)
    RETURNING * INTO v_commande;

    FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes)
    LOOP
        SELECT * INTO v_plat FROM plats WHERE id = (v_ligne->>'id_plat')::INTEGER;
        IF v_plat IS NULL THEN
            RAISE EXCEPTION 'Plat introuvable (id %).', (v_ligne->>'id_plat');
        END IF;
        IF NOT v_plat.actif OR NOT v_plat.disponibilite THEN
            RAISE EXCEPTION 'Le plat "%" n''est pas disponible actuellement.', v_plat.nom;
        END IF;

        v_quantite := COALESCE((v_ligne->>'quantite')::INTEGER, 0);
        IF v_quantite <= 0 THEN
            RAISE EXCEPTION 'Quantité invalide pour "%".', v_plat.nom;
        END IF;

        v_id_variante := NULLIF(v_ligne->>'id_variante', '')::INTEGER;
        IF v_id_variante IS NOT NULL THEN
            SELECT * INTO v_variante FROM variantes
                WHERE id = v_id_variante AND id_plat = v_plat.id AND actif;
            IF v_variante IS NULL THEN
                RAISE EXCEPTION 'Variante invalide pour "%".', v_plat.nom;
            END IF;
            v_prix := v_variante.prix;
        ELSE
            IF v_plat.prix IS NULL THEN
                RAISE EXCEPTION 'Une variante est requise pour "%".', v_plat.nom;
            END IF;
            v_prix := v_plat.prix;
        END IF;

        IF v_plat.sur_commande THEN
            IF NOW() > v_coupure THEN
                RAISE EXCEPTION
                    'Les Jeudis Gourmands doivent être commandés avant mercredi 22h00 pour le jeudi suivant.';
            END IF;
            v_date_prevue := v_prochain_jeudi;
        END IF;

        INSERT INTO commande_lignes (
            id_commande, id_plat, id_variante, quantite, prix_unitaire,
            option_vegetarien, commentaire
        ) VALUES (
            v_commande.id, v_plat.id, v_id_variante, v_quantite, v_prix,
            COALESCE((v_ligne->>'option_vegetarien')::BOOLEAN, false),
            v_ligne->>'commentaire'
        );

        v_total := v_total + (v_prix * v_quantite);
    END LOOP;

    UPDATE commandes_client SET total = v_total, date_prevue = v_date_prevue
        WHERE id = v_commande.id
        RETURNING * INTO v_commande;

    RETURN v_commande;
END;
$$ LANGUAGE plpgsql;
