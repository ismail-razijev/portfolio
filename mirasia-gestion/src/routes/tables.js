const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Lecture publique (délibérément) : commande.html/salle.js ont besoin de la
// liste des tables pour laisser choisir un numéro sans exposer d'action
// d'écriture. Gestion (POST/PATCH/DELETE) réservée au staff ci-dessous.
//
// La réservation jointe est celle du jour, la plus proche dans le temps :
// utile pour afficher "Rés. 20h00 - Aliyev" directement sur le plan de
// salle sans que l'écran ait à recouper deux listes lui-même.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, r.heure_reservation, r.nom_client AS reservation_client, r.nb_personnes AS reservation_personnes
      FROM tables_salle t
      LEFT JOIN LATERAL (
        SELECT heure_reservation, nom_client, nb_personnes
        FROM reservations
        WHERE id_table = t.id AND date_reservation = CURRENT_DATE AND statut != 'annulee'
        ORDER BY heure_reservation ASC
        LIMIT 1
      ) r ON true
      ORDER BY t.numero
    `);
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
    // occupee_depuis suit le passage à 'occupee' automatiquement : posée à
    // NOW() à l'entrée, effacée à la sortie, inchangée sinon. `statut` à
    // droite du CASE désigne la valeur avant cette mise à jour (Postgres
    // évalue le SET sur la ligne d'origine), donc pas besoin d'un aller-retour
    // SELECT avant l'UPDATE.
    const result = await pool.query(
      `UPDATE tables_salle SET
         numero = COALESCE($1, numero),
         capacite = COALESCE($2, capacite),
         statut = COALESCE($3, statut),
         forme = COALESCE($4, forme),
         pos_x = COALESCE($5, pos_x),
         pos_y = COALESCE($6, pos_y),
         occupee_depuis = CASE
           WHEN COALESCE($3, statut) = 'occupee' AND statut != 'occupee' THEN NOW()
           WHEN COALESCE($3, statut) != 'occupee' THEN NULL
           ELSE occupee_depuis
         END
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
