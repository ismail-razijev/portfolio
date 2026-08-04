const pool = require("./pool");
const { hashPassword } = require("../utils/password");

// Crée le tout premier compte admin à partir de ADMIN_USERNAME/ADMIN_PASSWORD
// si la table users est vide. Ne fait rien ensuite : la gestion des comptes
// passe par l'application (page Comptes) une fois ce compte initial créé.
async function bootstrapAdmin() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
  if (rows[0].n > 0) return;

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn(
      "Aucun utilisateur en base et ADMIN_USERNAME/ADMIN_PASSWORD absents : impossible de créer le premier compte admin."
    );
    return;
  }

  const { salt, hash } = hashPassword(password);
  await pool.query(
    `INSERT INTO users (username, nom_complet, password_hash, password_salt, role)
     VALUES ($1, 'Administrateur', $2, $3, 'admin')`,
    [username, hash, salt]
  );
  console.log(`Compte admin initial créé : ${username}`);
}

module.exports = { bootstrapAdmin };
