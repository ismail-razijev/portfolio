// Autorise uniquement les rôles listés. Toujours vérifier l'authentification
// d'abord (401) avant le rôle (403), pour ne pas révéler qu'une route existe
// à quelqu'un qui n'est même pas connecté.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Non authentifié. Connecte-toi d'abord." });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Accès refusé pour ce rôle." });
    }
    next();
  };
}

module.exports = { requireRole };
