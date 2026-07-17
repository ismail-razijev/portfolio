function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ message: "Non authentifié. Connecte-toi d'abord." });
}

module.exports = { requireAuth };
