-- Migration V1.5 : plan de salle personnalisable
--
-- Permet de recréer visuellement la salle du restaurant : chaque table a une
-- forme (carrée ou ronde) et une position libre sur un plan, au lieu d'être
-- listée dans une simple grille sans rapport avec la disposition réelle.

ALTER TABLE tables_salle ADD COLUMN forme VARCHAR(10) NOT NULL DEFAULT 'carre'
    CHECK (forme IN ('carre', 'rond'));
ALTER TABLE tables_salle ADD COLUMN pos_x INTEGER NOT NULL DEFAULT 20;
ALTER TABLE tables_salle ADD COLUMN pos_y INTEGER NOT NULL DEFAULT 20;
