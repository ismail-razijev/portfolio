const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { id_plat } = req.query;
    const result = id_plat
      ? await pool.query(
          "SELECT * FROM variantes WHERE id_plat = $1 ORDER BY nom",
          [id_plat]
        )
      : await pool.query("SELECT * FROM variantes ORDER BY id_plat, nom");
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { id_plat, nom, prix, actif } = req.body;
  if (!id_plat || !nom || prix === undefined || prix === null) {
    return res.status(400).json({
      message: "Les champs 'id_plat', 'nom' et 'prix' sont requis.",
    });
  }
  try {
    const result = await pool.query(
      `INSERT INTO variantes (id_plat, nom, prix, actif)
       VALUES ($1, $2, $3, COALESCE($4, true)) RETURNING *`,
      [id_plat, nom, prix, actif]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const { nom, prix, actif } = req.body;
  try {
    const result = await pool.query(
      `UPDATE variantes SET
         nom = COALESCE($1, nom),
         prix = COALESCE($2, prix),
         actif = COALESCE($3, actif)
       WHERE id = $4 RETURNING *`,
      [nom, prix, actif, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Variante introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM variantes WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Variante introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
