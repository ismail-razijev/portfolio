const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

const SELECT_PREPARATIONS = `
  SELECT preparations.*, plats.nom AS plat_nom
  FROM preparations
  JOIN plats ON preparations.id_plat = plats.id
`;

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_PREPARATIONS} ORDER BY preparations.date_prevue`
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { id_plat, quantite_prevue, date_prevue, statut } = req.body;
  if (!id_plat || !quantite_prevue || !date_prevue) {
    return res.status(400).json({
      message:
        "Les champs 'id_plat', 'quantite_prevue' et 'date_prevue' sont requis.",
    });
  }
  try {
    const result = await pool.query(
      `INSERT INTO preparations (id_plat, quantite_prevue, date_prevue, statut)
       VALUES ($1, $2, $3, COALESCE($4, 'prevue')) RETURNING *`,
      [id_plat, quantite_prevue, date_prevue, statut]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const { quantite_prevue, date_prevue, statut } = req.body;
  try {
    const result = await pool.query(
      `UPDATE preparations SET
         quantite_prevue = COALESCE($1, quantite_prevue),
         date_prevue = COALESCE($2, date_prevue),
         statut = COALESCE($3, statut)
       WHERE id = $4 RETURNING *`,
      [quantite_prevue, date_prevue, statut, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Préparation introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM preparations WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Préparation introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
