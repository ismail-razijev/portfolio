require("dotenv").config();
const { Pool, types } = require("pg");

// Les colonnes DATE (sans heure) sont renvoyées telles quelles ("YYYY-MM-DD")
// plutôt que converties en objet Date : évite un décalage d'un jour au format
// JSON selon le fuseau horaire du serveur (le pilote pg convertit sinon la
// date en horodatage UTC de minuit local, ce qui peut afficher la veille).
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;
