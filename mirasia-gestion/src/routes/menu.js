const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");

const router = express.Router();

// Carte publique : uniquement les plats actifs et disponibles, avec leurs
// variantes actives, groupés par catégorie. Route publique (pas de requireAuth) :
// délibérément séparée de /api/plats (réservée à l'admin, expose des plats
// inactifs/indisponibles et les champs du module stock surgelé).
router.get("/", async (req, res) => {
  try {
    const categories = await pool.query(
      "SELECT * FROM categories ORDER BY ordre_affichage, nom"
    );
    const plats = await pool.query(`
      SELECT p.id, p.nom, p.id_categorie, p.description, p.vegetarien,
             p.prix, p.unite, p.sur_commande,
             COALESCE(
               json_agg(
                 json_build_object('id', v.id, 'nom', v.nom, 'prix', v.prix)
                 ORDER BY v.nom
               ) FILTER (WHERE v.id IS NOT NULL),
               '[]'
             ) AS variantes
      FROM plats p
      LEFT JOIN variantes v ON v.id_plat = p.id AND v.actif
      WHERE p.actif AND p.disponibilite AND p.id_categorie IS NOT NULL
      GROUP BY p.id
      ORDER BY p.nom
    `);

    const carte = categories.rows.map((c) => ({
      ...c,
      plats: plats.rows.filter((p) => p.id_categorie === c.id),
    }));
    res.json(carte);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
