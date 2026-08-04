const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");
const { hashPassword } = require("../utils/password");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, nom_complet, role, actif, date_creation FROM users ORDER BY username"
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.post("/", async (req, res) => {
  const { username, password, nom_complet, role } = req.body;
  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ message: "Les champs 'username', 'password' et 'role' sont requis." });
  }
  try {
    const { salt, hash } = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO users (username, nom_complet, password_hash, password_salt, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, nom_complet, role, actif, date_creation`,
      [username, nom_complet || null, hash, salt, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.patch("/:id", async (req, res) => {
  const { nom_complet, role, actif, password } = req.body;
  const targetId = Number(req.params.id);

  if (
    req.session.user.id === targetId &&
    (actif === false || (role && role !== req.session.user.role))
  ) {
    return res.status(400).json({
      message: "Tu ne peux pas désactiver ton propre compte ou changer ton propre rôle.",
    });
  }

  try {
    let passwordHash = null;
    let passwordSalt = null;
    if (password) {
      const hashed = hashPassword(password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }
    const result = await pool.query(
      `UPDATE users SET
         nom_complet = COALESCE($1, nom_complet),
         role = COALESCE($2, role),
         actif = COALESCE($3, actif),
         password_hash = COALESCE($4, password_hash),
         password_salt = COALESCE($5, password_salt)
       WHERE id = $6
       RETURNING id, username, nom_complet, role, actif, date_creation`,
      [nom_complet, role, actif, passwordHash, passwordSalt, targetId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

router.delete("/:id", async (req, res) => {
  const targetId = Number(req.params.id);
  if (req.session.user.id === targetId) {
    return res.status(400).json({ message: "Tu ne peux pas supprimer ton propre compte." });
  }
  try {
    const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [targetId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
