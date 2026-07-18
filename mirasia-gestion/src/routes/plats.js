const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

const SELECT_PLATS = `
  SELECT plats.*, cuisines.nom AS cuisine_nom, categories.nom AS categorie_nom
  FROM plats
  LEFT JOIN cuisines ON plats.id_cuisine = cuisines.id
  LEFT JOIN categories ON plats.id_categorie = categories.id
`;

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`${SELECT_PLATS} ORDER BY plats.nom`);
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_PLATS} WHERE plats.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Plat introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const {
    nom, id_cuisine, prix, actif,
    id_categorie, description, vegetarien, disponibilite, sur_commande, unite,
  } = req.body;
  if (!nom) {
    return res.status(400).json({ message: "Le champ 'nom' est requis." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO plats (
         nom, id_cuisine, prix, actif,
         id_categorie, description, vegetarien, disponibilite, sur_commande, unite
       )
       VALUES (
         $1, $2, $3, COALESCE($4, true),
         $5, $6, COALESCE($7, 'non'), COALESCE($8, true), COALESCE($9, false), COALESCE($10, 'plat')
       ) RETURNING *`,
      [
        nom, id_cuisine || null, prix || null, actif,
        id_categorie || null, description || null, vegetarien, disponibilite, sur_commande, unite,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const {
    nom, id_cuisine, prix, actif,
    id_categorie, description, vegetarien, disponibilite, sur_commande, unite,
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE plats SET
         nom = COALESCE($1, nom),
         id_cuisine = COALESCE($2, id_cuisine),
         prix = COALESCE($3, prix),
         actif = COALESCE($4, actif),
         id_categorie = COALESCE($5, id_categorie),
         description = COALESCE($6, description),
         vegetarien = COALESCE($7, vegetarien),
         disponibilite = COALESCE($8, disponibilite),
         sur_commande = COALESCE($9, sur_commande),
         unite = COALESCE($10, unite)
       WHERE id = $11 RETURNING *`,
      [
        nom, id_cuisine, prix, actif,
        id_categorie, description, vegetarien, disponibilite, sur_commande, unite,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Plat introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM plats WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Plat introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
