const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const stockBas = await pool.query(`
      SELECT stock.*, plats.nom AS plat_nom
      FROM stock
      JOIN plats ON stock.id_plat = plats.id
      WHERE stock.quantite <= stock.seuil_alerte
      ORDER BY stock.quantite ASC
    `);

    const preparationsDuJour = await pool.query(`
      SELECT preparations.*, plats.nom AS plat_nom
      FROM preparations
      JOIN plats ON preparations.id_plat = plats.id
      WHERE preparations.date_prevue = CURRENT_DATE
      ORDER BY preparations.statut
    `);

    const totaux = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM plats WHERE actif = true) AS plats_actifs,
        (SELECT COUNT(*) FROM stock WHERE quantite <= seuil_alerte) AS alertes_stock,
        (SELECT COUNT(*) FROM preparations WHERE statut != 'terminee') AS preparations_en_attente
    `);

    res.json({
      totaux: totaux.rows[0],
      stock_bas: stockBas.rows,
      preparations_du_jour: preparationsDuJour.rows,
    });
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
