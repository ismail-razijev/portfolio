const express = require("express");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.authenticated = true;
    return res.json({ message: "Connecté." });
  }
  res.status(401).json({ message: "Identifiant ou mot de passe incorrect." });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Déconnecté." });
  });
});

router.get("/me", (req, res) => {
  res.json({ authenticated: Boolean(req.session && req.session.authenticated) });
});

module.exports = router;
