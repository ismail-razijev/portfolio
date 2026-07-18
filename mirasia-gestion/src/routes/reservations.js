const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Demande de réservation (public : reservation.html)
router.post("/", async (req, res) => {
  const { nom_client, telephone_client, date_reservation, heure_reservation, nb_personnes, commentaire } = req.body;
  if (!nom_client || !telephone_client || !date_reservation || !heure_reservation || !nb_personnes) {
    return res.status(400).json({
      message: "Les champs 'nom_client', 'telephone_client', 'date_reservation', 'heure_reservation' et 'nb_personnes' sont requis.",
    });
  }
  try {
    const result = await pool.query(
      `INSERT INTO reservations (nom_client, telephone_client, date_reservation, heure_reservation, nb_personnes, commentaire)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nom_client, telephone_client, date_reservation, heure_reservation, nb_personnes, commentaire || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Liste des réservations (admin : reservations-admin.html)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, t.numero AS table_numero
      FROM reservations r
      LEFT JOIN tables_salle t ON t.id = r.id_table
      ORDER BY r.date_reservation, r.heure_reservation
    `);
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Confirmation / annulation / assignation de table (admin)
router.patch("/:id", requireAuth, async (req, res) => {
  const { statut, id_table } = req.body;
  try {
    const result = await pool.query(
      `UPDATE reservations SET
         statut = COALESCE($1, statut),
         id_table = COALESCE($2, id_table)
       WHERE id = $3 RETURNING *`,
      [statut, id_table, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Réservation introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
