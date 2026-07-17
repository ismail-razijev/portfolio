const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const totaux = await pool.query(`
      SELECT
        COALESCE(SUM(quantite * prix_unitaire), 0) AS chiffre_affaires_total,
        COALESCE(SUM(quantite), 0) AS plats_vendus,
        COUNT(*) AS nombre_ventes
      FROM commandes
    `);

    const topPlats = await pool.query(`
      SELECT plats.nom AS plat_nom,
             SUM(commandes.quantite) AS total_vendu,
             SUM(commandes.quantite * commandes.prix_unitaire) AS chiffre_affaires
      FROM commandes
      JOIN plats ON commandes.id_plat = plats.id
      GROUP BY plats.nom
      ORDER BY total_vendu DESC
      LIMIT 10
    `);

    const ventesParJour = await pool.query(`
      SELECT date_trunc('day', date_commande) AS jour,
             SUM(quantite * prix_unitaire) AS chiffre_affaires,
             SUM(quantite) AS plats_vendus
      FROM commandes
      WHERE date_commande >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY jour
      ORDER BY jour ASC
    `);

    res.json({
      totaux: totaux.rows[0],
      top_plats: topPlats.rows,
      ventes_par_jour: ventesParJour.rows,
    });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
