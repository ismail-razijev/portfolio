const pool = require("./pool");
const { hashPassword } = require("../utils/password");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Crée le tout premier compte admin à partir de ADMIN_USERNAME/ADMIN_PASSWORD
// si la table users est vide. Ne fait rien ensuite : la gestion des comptes
// passe par l'application (page Comptes) une fois ce compte initial créé.
//
// Retry sur "relation users does not exist" (code 42P01) : au tout premier
// déploiement de cette version, il peut y avoir une course entre le démarrage
// de l'app et l'application de la migration users sur la base. Sans retry, le
// bootstrap échoue une fois et ne se relance qu'au prochain redémarrage.
async function bootstrapAdmin(attempt = 1) {
  let rows;
  try {
    ({ rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users"));
  } catch (err) {
    if (err.code === "42P01" && attempt < 5) {
      console.warn(`Table users pas encore prête, nouvelle tentative dans 3s (${attempt}/5)...`);
      await sleep(3000);
      return bootstrapAdmin(attempt + 1);
    }
    throw err;
  }
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
     VALUES ($1, 'Administrateur', $2, $3, 'admin')
     ON CONFLICT (username) DO NOTHING`,
    [username, hash, salt]
  );
  console.log(`Compte admin initial créé : ${username}`);
}

module.exports = { bootstrapAdmin };
