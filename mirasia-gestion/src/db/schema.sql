-- Schéma V1 : gestion du stock, planning de préparation, dashboard

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
    prix NUMERIC(6,2),
    actif BOOLEAN NOT NULL DEFAULT true
);

-- Table du stock (plats surgelés déjà préparés, disponibles à la vente)
CREATE TABLE stock (
    id SERIAL PRIMARY KEY,
    id_plat INTEGER NOT NULL REFERENCES plats(id),
    quantite INTEGER NOT NULL DEFAULT 0,
    seuil_alerte INTEGER NOT NULL DEFAULT 5,
    date_preparation DATE NOT NULL,
    date_peremption DATE
);

-- Table du planning de préparation (ce qui reste à préparer)
CREATE TABLE preparations (
    id SERIAL PRIMARY KEY,
    id_plat INTEGER NOT NULL REFERENCES plats(id),
    quantite_prevue INTEGER NOT NULL,
    date_prevue DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'prevue'
        CHECK (statut IN ('prevue', 'en_cours', 'terminee'))
);
