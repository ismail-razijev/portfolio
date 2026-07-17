const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cuisines ORDER BY nom");
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { nom } = req.body;
  if (!nom) {
    return res.status(400).json({ message: "Le champ 'nom' est requis." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO cuisines (nom) VALUES ($1) RETURNING *",
      [nom]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const { nom } = req.body;
  try {
    const result = await pool.query(
      "UPDATE cuisines SET nom = COALESCE($1, nom) WHERE id = $2 RETURNING *",
      [nom, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cuisine introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM cuisines WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Cuisine introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
