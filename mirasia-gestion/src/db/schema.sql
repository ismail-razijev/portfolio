-- Schéma V1.1 : gestion du stock, planning de préparation, dashboard, historique des mouvements

-- Table des cuisines (Ouïghour, Kazakh, Ouzbek, etc.)
CREATE TABLE cuisines (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL UNIQUE
);

-- Table des plats
CREATE TABLE plats (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    id_cuisine INTEGER REFERENCES cuisines(id),
    prix NUMERIC(6,2) CHECK (prix IS NULL OR prix >= 0),
    actif BOOLEAN NOT NULL DEFAULT true
);

-- Table du stock (plats surgelés déjà préparés, disponibles à la vente)
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    id_plat INTEGER NOT NULL REFERENCES plats(id),
    quantite INTEGER NOT NULL DEFAULT 0 CHECK (quantite >= 0),
    seuil_alerte INTEGER NOT NULL DEFAULT 5 CHECK (seuil_alerte >= 0),
    date_preparation DATE NOT NULL,
    date_peremption DATE
);

-- Table du planning de préparation (ce qui reste à préparer)
CREATE TABLE preparations (
    id SERIAL PRIMARY KEY,
    id_plat INTEGER NOT NULL REFERENCES plats(id),
    quantite_prevue INTEGER NOT NULL CHECK (quantite_prevue > 0),
    date_prevue DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'prevue'
        CHECK (statut IN ('prevue', 'en_cours', 'terminee'))
);

-- Historique des mouvements de stock : chaque changement de quantité est tracé automatiquement
CREATE TABLE stock_mouvements (
    id SERIAL PRIMARY KEY,
    id_stock INTEGER NOT NULL REFERENCES stock(id) ON DELETE CASCADE,
    ancienne_quantite INTEGER NOT NULL,
    nouvelle_quantite INTEGER NOT NULL,
    date_mouvement TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Fonction PL/pgSQL : enregistre un mouvement à chaque UPDATE qui change la quantité
CREATE OR REPLACE FUNCTION fn_log_mouvement_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quantite IS DISTINCT FROM OLD.quantite THEN
        INSERT INTO stock_mouvements (id_stock, ancienne_quantite, nouvelle_quantite)
        VALUES (OLD.id, OLD.quantite, NEW.quantite);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger : appelle la fonction ci-dessus après chaque modification d'une ligne de stock
CREATE TRIGGER trg_log_mouvement_stock
AFTER UPDATE ON stock
FOR EACH ROW
EXECUTE FUNCTION fn_log_mouvement_stock();
