const express = require("express");
const pool = require("../db/pool");

const router = express.Router();

const SELECT_PLATS = `
  SELECT plats.*, cuisines.nom AS cuisine_nom
  FROM plats
  LEFT JOIN cuisines ON plats.id_cuisine = cuisines.id
`;

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`${SELECT_PLATS} ORDER BY plats.nom`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const { nom, id_cuisine, prix, actif } = req.body;
  if (!nom) {
    return res.status(400).json({ message: "Le champ 'nom' est requis." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO plats (nom, id_cuisine, prix, actif)
       VALUES ($1, $2, $3, COALESCE($4, true)) RETURNING *`,
      [nom, id_cuisine || null, prix || null, actif]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  const { nom, id_cuisine, prix, actif } = req.body;
  try {
    const result = await pool.query(
      `UPDATE plats SET
         nom = COALESCE($1, nom),
         id_cuisine = COALESCE($2, id_cuisine),
         prix = COALESCE($3, prix),
         actif = COALESCE($4, actif)
       WHERE id = $5 RETURNING *`,
      [nom, id_cuisine, prix, actif, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Plat introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
