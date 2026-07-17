const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT commandes.*, plats.nom AS plat_nom
      FROM commandes
      JOIN plats ON commandes.id_plat = plats.id
      ORDER BY commandes.date_commande DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Enregistre une vente : décrémente le stock automatiquement (fonction PL/pgSQL fn_enregistrer_vente)
router.post("/", async (req, res) => {
  const { id_plat, quantite } = req.body;
  if (!id_plat || !quantite) {
    return res
      .status(400)
      .json({ message: "Les champs 'id_plat' et 'quantite' sont requis." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM fn_enregistrer_vente($1, $2)",
      [id_plat, quantite]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
