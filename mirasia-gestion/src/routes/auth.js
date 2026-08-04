const express = require("express");
const pool = require("../db/pool");
const { verifyPassword } = require("../utils/password");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Identifiant et mot de passe requis." });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND actif",
      [username]
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ message: "Identifiant ou mot de passe incorrect." });
    }
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ message: "Connecté.", username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Déconnecté." });
  });
});

router.get("/me", (req, res) => {
  const user = req.session && req.session.user;
  res.json({
    authenticated: Boolean(user),
    id: user ? user.id : null,
    username: user ? user.username : null,
    role: user ? user.role : null,
  });
});

module.exports = router;
