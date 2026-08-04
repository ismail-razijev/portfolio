const crypto = require("crypto");

// scrypt (module crypto natif de Node) plutôt que bcrypt : évite une
// dépendance native à recompiler sur l'hébergeur (Render free tier).
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const candidate = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

module.exports = { hashPassword, verifyPassword };
