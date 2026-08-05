-- Migration V1.6 : dashboard analytique + plan de salle "vivant"
--
-- Ajoute uniquement ce qu'il faut pour que la salle et le dashboard
-- affichent des informations réelles (durée d'occupation, réservation liée)
-- au lieu de les fabriquer côté écran : occupee_depuis est posée par
-- l'application au moment où une table passe à 'occupee' (voir
-- src/routes/tables.js), et remise à NULL dès qu'elle n'est plus occupée.

ALTER TABLE tables_salle ADD COLUMN occupee_depuis TIMESTAMP NULL;
