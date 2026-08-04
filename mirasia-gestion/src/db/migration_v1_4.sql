-- Migration V1.4 : gestion multi-utilisateurs avec rôles
--
-- Remplace le compte admin unique (ADMIN_USERNAME/ADMIN_PASSWORD en .env) par
-- une vraie table d'utilisateurs : chaque membre du staff a son propre compte,
-- avec un rôle qui détermine ce qu'il peut voir/faire dans l'application.
--
-- Rôles :
--   admin   : back-office complet (stock, carte, ventes, statistiques, comptes)
--   cuisine : écran cuisine uniquement (suivi et changement de statut des commandes)
--   salle   : interface salle (tables, prise de commande, réservations)
--
-- ADMIN_USERNAME/ADMIN_PASSWORD restent utilisés, mais uniquement pour créer
-- automatiquement le tout premier compte admin au démarrage si la table users
-- est vide (voir src/db/bootstrapAdmin.js). Une fois ce compte créé, la gestion
-- des utilisateurs se fait depuis l'application (page Comptes, admin only).

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    nom_complet VARCHAR(100),
    password_hash VARCHAR(200) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'cuisine', 'salle')),
    actif BOOLEAN NOT NULL DEFAULT true,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW()
);
