const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Lecture publique (délibérément) : commande.html/salle.js ont besoin de la
// liste des tables pour laisser choisir un numéro sans exposer d'action
// d'écriture. Gestion (POST/PATCH/DELETE) réservée au staff ci-dessous.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tables_salle ORDER BY numero"
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", requireRole("admin", "salle"), async (req, res) => {
  const { numero, capacite } = req.body;
  if (!numero) {
    return res.status(400).json({ message: "Le champ 'numero' est requis." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tables_salle (numero, capacite)
       VALUES ($1, COALESCE($2, 4)) RETURNING *`,
      [numero, capacite]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", requireRole("admin", "salle"), async (req, res) => {
  const { numero, capacite, statut } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tables_salle SET
         numero = COALESCE($1, numero),
         capacite = COALESCE($2, capacite),
         statut = COALESCE($3, statut)
       WHERE id = $4 RETURNING *`,
      [numero, capacite, statut, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Table introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", requireRole("admin", "salle"), async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM tables_salle WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Table introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
