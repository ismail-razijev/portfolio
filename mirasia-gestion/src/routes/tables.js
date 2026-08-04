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
  const { numero, capacite, forme, pos_x, pos_y } = req.body;
  if (!numero) {
    return res.status(400).json({ message: "Le champ 'numero' est requis." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tables_salle (numero, capacite, forme, pos_x, pos_y)
       VALUES ($1, COALESCE($2, 4), COALESCE($3, 'carre'), COALESCE($4, 20), COALESCE($5, 20))
       RETURNING *`,
      [numero, capacite, forme, pos_x, pos_y]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", requireRole("admin", "salle"), async (req, res) => {
  const { numero, capacite, statut, forme, pos_x, pos_y } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tables_salle SET
         numero = COALESCE($1, numero),
         capacite = COALESCE($2, capacite),
         statut = COALESCE($3, statut),
         forme = COALESCE($4, forme),
         pos_x = COALESCE($5, pos_x),
         pos_y = COALESCE($6, pos_y)
       WHERE id = $7 RETURNING *`,
      [numero, capacite, statut, forme, pos_x, pos_y, req.params.id]
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
