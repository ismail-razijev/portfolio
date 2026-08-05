const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const stockBas = await pool.query(`
      SELECT stock.*, plats.nom AS plat_nom, cuisines.nom AS cuisine_nom
      FROM stock
      JOIN plats ON stock.id_plat = plats.id
      LEFT JOIN cuisines ON plats.id_cuisine = cuisines.id
      WHERE stock.quantite <= stock.seuil_alerte
      ORDER BY (stock.quantite::float / NULLIF(stock.seuil_alerte, 0)) ASC
    `);

    const preparationsDuJour = await pool.query(`
      SELECT preparations.*, plats.nom AS plat_nom,
        (preparations.date_prevue < CURRENT_DATE AND preparations.statut != 'terminee') AS en_retard
      FROM preparations
      JOIN plats ON preparations.id_plat = plats.id
      WHERE preparations.date_prevue = CURRENT_DATE
         OR (preparations.date_prevue < CURRENT_DATE AND preparations.statut != 'terminee')
      ORDER BY en_retard DESC, preparations.statut ASC
    `);

    const totaux = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM plats WHERE actif = true) AS plats_actifs,
        (SELECT COUNT(*) FROM stock WHERE quantite <= seuil_alerte) AS alertes_stock,
        (SELECT COUNT(*) FROM preparations WHERE statut != 'terminee') AS preparations_en_attente
    `);

    const preparationsStats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE date_prevue = CURRENT_DATE AND statut = 'terminee') AS terminees,
        COUNT(*) FILTER (WHERE date_prevue = CURRENT_DATE AND statut != 'terminee') AS en_cours,
        COUNT(*) FILTER (WHERE date_prevue < CURRENT_DATE AND statut != 'terminee') AS en_retard
      FROM preparations
    `);

    // Ventes du jour / veille : même pipeline que commandes-client/statistiques
    // (commandes sur place + à emporter, hors annulées), mais recadré sur le
    // strict nécessaire au widget du dashboard.
    const ventesJour = await pool.query(`
      SELECT COUNT(*) AS nombre_commandes, COALESCE(SUM(total), 0) AS chiffre_affaires
      FROM commandes_client
      WHERE date_commande::date = CURRENT_DATE AND statut != 'annule'
    `);
    const ventesHier = await pool.query(`
      SELECT COALESCE(SUM(total), 0) AS chiffre_affaires
      FROM commandes_client
      WHERE date_commande::date = CURRENT_DATE - INTERVAL '1 day' AND statut != 'annule'
    `);
    const ventesDixJours = await pool.query(`
      SELECT date_trunc('day', date_commande)::date AS jour, COALESCE(SUM(total), 0) AS chiffre_affaires
      FROM commandes_client
      WHERE date_commande >= CURRENT_DATE - INTERVAL '9 days' AND statut != 'annule'
      GROUP BY jour
      ORDER BY jour ASC
    `);

    const salleStats = await pool.query(`
      SELECT
        COUNT(*) AS tables_total,
        COUNT(*) FILTER (WHERE statut = 'occupee') AS tables_occupees,
        COALESCE(SUM(capacite) FILTER (WHERE statut = 'occupee'), 0) AS couverts
      FROM tables_salle
    `);

    const chiffreJour = Number(ventesJour.rows[0].chiffre_affaires);
    const chiffreHier = Number(ventesHier.rows[0].chiffre_affaires);
    const variationPct = chiffreHier > 0
      ? Math.round(((chiffreJour - chiffreHier) / chiffreHier) * 100)
      : null;

    res.json({
      totaux: totaux.rows[0],
      stock_bas: stockBas.rows,
      preparations_du_jour: preparationsDuJour.rows,
      preparations_stats: preparationsStats.rows[0],
      ventes: {
        aujourd_hui: ventesJour.rows[0],
        hier: ventesHier.rows[0],
        variation_pct: variationPct,
        dix_jours: ventesDixJours.rows,
      },
      salle: salleStats.rows[0],
    });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
