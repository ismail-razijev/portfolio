-- Migration V1.1 : contraintes d'intégrité + historique des mouvements de stock

-- Empêche les valeurs absurdes (prix négatif, quantité négative...)
ALTER TABLE plats ADD CONSTRAINT plats_prix_positif CHECK (prix IS NULL OR prix >= 0);
ALTER TABLE stock ADD CONSTRAINT stock_quantite_positive CHECK (quantite >= 0);
ALTER TABLE stock ADD CONSTRAINT stock_seuil_positif CHECK (seuil_alerte >= 0);
ALTER TABLE preparations ADD CONSTRAINT preparations_quantite_positive CHECK (quantite_prevue > 0);

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
