const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM categories ORDER BY ordre_affichage, nom"
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { nom, ordre_affichage } = req.body;
  if (!nom) {
    return res.status(400).json({ message: "Le champ 'nom' est requis." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO categories (nom, ordre_affichage)
       VALUES ($1, COALESCE($2, 0)) RETURNING *`,
      [nom, ordre_affichage]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const { nom, ordre_affichage } = req.body;
  try {
    const result = await pool.query(
      `UPDATE categories SET
         nom = COALESCE($1, nom),
         ordre_affichage = COALESCE($2, ordre_affichage)
       WHERE id = $3 RETURNING *`,
      [nom, ordre_affichage, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM categories WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
