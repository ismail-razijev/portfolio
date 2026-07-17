const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

const SELECT_STOCK = `
  SELECT stock.*, plats.nom AS plat_nom
  FROM stock
  JOIN plats ON stock.id_plat = plats.id
`;

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_STOCK} ORDER BY stock.date_preparation DESC`
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { id_plat, quantite, seuil_alerte, date_preparation, date_peremption } =
    req.body;
  if (!id_plat || !date_preparation) {
    return res
      .status(400)
      .json({ message: "Les champs 'id_plat' et 'date_preparation' sont requis." });
  }
  try {
    const result = await pool.query(
      `INSERT INTO stock (id_plat, quantite, seuil_alerte, date_preparation, date_peremption)
       VALUES ($1, COALESCE($2, 0), COALESCE($3, 5), $4, $5) RETURNING *`,
      [id_plat, quantite, seuil_alerte, date_preparation, date_peremption || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const { quantite, seuil_alerte, date_preparation, date_peremption } = req.body;
  try {
    const result = await pool.query(
      `UPDATE stock SET
         quantite = COALESCE($1, quantite),
         seuil_alerte = COALESCE($2, seuil_alerte),
         date_preparation = COALESCE($3, date_preparation),
         date_peremption = COALESCE($4, date_peremption)
       WHERE id = $5 RETURNING *`,
      [quantite, seuil_alerte, date_preparation, date_peremption, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ligne de stock introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.get("/mouvements/recentes", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT stock_mouvements.*, plats.nom AS plat_nom
      FROM stock_mouvements
      JOIN stock ON stock_mouvements.id_stock = stock.id
      JOIN plats ON stock.id_plat = plats.id
      ORDER BY stock_mouvements.date_mouvement DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM stock WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Ligne de stock introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
