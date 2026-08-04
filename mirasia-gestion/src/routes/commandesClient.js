const express = require("express");
const pool = require("../db/pool");
const { handleDbError } = require("../utils/errors");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

const SELECT_COMMANDES = `
  SELECT c.*, t.numero AS table_numero,
    COALESCE(
      json_agg(
        json_build_object(
          'id', l.id,
          'id_plat', l.id_plat,
          'plat_nom', p.nom,
          'variante_nom', v.nom,
          'quantite', l.quantite,
          'prix_unitaire', l.prix_unitaire,
          'option_vegetarien', l.option_vegetarien,
          'commentaire', l.commentaire
        ) ORDER BY l.id
      ) FILTER (WHERE l.id IS NOT NULL),
      '[]'
    ) AS lignes
  FROM commandes_client c
  LEFT JOIN tables_salle t ON t.id = c.id_table
  LEFT JOIN commande_lignes l ON l.id_commande = c.id
  LEFT JOIN plats p ON p.id = l.id_plat
  LEFT JOIN variantes v ON v.id = l.id_variante
`;

// Création d'une commande client (public : commande.html et salle.js).
// Toute la logique (prix, disponibilité, règle Jeudis Gourmands) est dans
// fn_creer_commande_client - voir migration_v1_3.sql.
router.post("/", async (req, res) => {
  const { mode, id_table, nom_client, telephone_client, lignes } = req.body;
  if (!mode || !Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({
      message: "Les champs 'mode' et 'lignes' (au moins un article) sont requis.",
    });
  }
  try {
    const result = await pool.query(
      "SELECT * FROM fn_creer_commande_client($1, $2, $3, $4, $5)",
      [mode, id_table || null, nom_client || null, telephone_client || null, JSON.stringify(lignes)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Liste des commandes (cuisine, salle, admin). ?statut=recu,en_preparation
router.get("/", requireRole("admin", "cuisine", "salle"), async (req, res) => {
  try {
    const params = [];
    let where = "";
    if (req.query.statut) {
      params.push(req.query.statut.split(","));
      where = "WHERE c.statut = ANY($1::varchar[])";
    }
    const result = await pool.query(
      `${SELECT_COMMANDES} ${where} GROUP BY c.id, t.numero ORDER BY c.date_commande ASC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Statistiques du jour pour le dashboard ventes restaurant (distinct des
// statistiques du module stock surgelé, voir statistiques.js).
router.get("/statistiques", requireRole("admin"), async (req, res) => {
  try {
    const totaux = await pool.query(`
      SELECT COUNT(*) AS nombre_commandes, COALESCE(SUM(total), 0) AS chiffre_affaires
      FROM commandes_client
      WHERE date_commande::date = CURRENT_DATE AND statut != 'annule'
    `);
    const topPlats = await pool.query(`
      SELECT p.nom AS plat_nom, SUM(l.quantite) AS quantite_vendue
      FROM commande_lignes l
      JOIN commandes_client c ON c.id = l.id_commande
      JOIN plats p ON p.id = l.id_plat
      WHERE c.date_commande::date = CURRENT_DATE AND c.statut != 'annule'
      GROUP BY p.nom
      ORDER BY quantite_vendue DESC
      LIMIT 5
    `);
    const parCategorie = await pool.query(`
      SELECT cat.nom AS categorie_nom, SUM(l.quantite * l.prix_unitaire) AS chiffre_affaires
      FROM commande_lignes l
      JOIN commandes_client c ON c.id = l.id_commande
      JOIN plats p ON p.id = l.id_plat
      LEFT JOIN categories cat ON cat.id = p.id_categorie
      WHERE c.date_commande::date = CURRENT_DATE AND c.statut != 'annule'
      GROUP BY cat.nom
      ORDER BY chiffre_affaires DESC
    `);
    res.json({
      totaux: totaux.rows[0],
      top_plats: topPlats.rows,
      chiffre_par_categorie: parCategorie.rows,
    });
  } catch (err) {
    handleDbError(err, res);
  }
});

// Export CSV des commandes (compta). ?date=2026-07-18, sinon toutes.
router.get("/export.csv", requireRole("admin"), async (req, res) => {
  try {
    const params = [];
    let where = "";
    if (req.query.date) {
      params.push(req.query.date);
      where = "WHERE c.date_commande::date = $1";
    }
    const result = await pool.query(
      `SELECT c.id AS commande_id, c.date_commande, c.mode, t.numero AS table_numero,
              c.statut, p.nom AS plat_nom, v.nom AS variante_nom,
              l.quantite, l.prix_unitaire, (l.quantite * l.prix_unitaire) AS sous_total
       FROM commande_lignes l
       JOIN commandes_client c ON c.id = l.id_commande
       JOIN plats p ON p.id = l.id_plat
       LEFT JOIN variantes v ON v.id = l.id_variante
       LEFT JOIN tables_salle t ON t.id = c.id_table
       ${where}
       ORDER BY c.date_commande ASC`,
      params
    );
    const entetes = [
      "commande_id", "date_commande", "mode", "table", "statut",
      "plat", "variante", "quantite", "prix_unitaire", "sous_total",
    ];
    const echapper = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lignesCsv = result.rows.map((r) =>
      [
        r.commande_id, r.date_commande.toISOString(), r.mode, r.table_numero || "",
        r.statut, r.plat_nom, r.variante_nom || "", r.quantite, r.prix_unitaire, r.sous_total,
      ]
        .map(echapper)
        .join(",")
    );
    const csv = [entetes.join(","), ...lignesCsv].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="commandes.csv"');
    res.send(csv);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Suivi d'une commande (public : le client vérifie le statut de sa commande).
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_COMMANDES} WHERE c.id = $1 GROUP BY c.id, t.numero`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Commande introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

// Cuisine/salle : changement de statut, et/ou ajout d'articles à une commande
// existante (salle.js). Staff uniquement.
router.patch("/:id", requireRole("admin", "cuisine", "salle"), async (req, res) => {
  const { statut, ajouter_lignes } = req.body;
  try {
    if (Array.isArray(ajouter_lignes) && ajouter_lignes.length > 0) {
      for (const ligne of ajouter_lignes) {
        const platRes = await pool.query("SELECT * FROM plats WHERE id = $1", [
          ligne.id_plat,
        ]);
        const plat = platRes.rows[0];
        if (!plat || !plat.actif || !plat.disponibilite) {
          return res.status(400).json({
            message: `Le plat "${plat ? plat.nom : ligne.id_plat}" n'est pas disponible actuellement.`,
          });
        }
        let prix = plat.prix;
        if (ligne.id_variante) {
          const varRes = await pool.query(
            "SELECT * FROM variantes WHERE id = $1 AND id_plat = $2 AND actif",
            [ligne.id_variante, plat.id]
          );
          if (varRes.rows.length === 0) {
            return res.status(400).json({ message: `Variante invalide pour "${plat.nom}".` });
          }
          prix = varRes.rows[0].prix;
        }
        if (prix === null) {
          return res.status(400).json({ message: `Une variante est requise pour "${plat.nom}".` });
        }
        await pool.query(
          `INSERT INTO commande_lignes (id_commande, id_plat, id_variante, quantite, prix_unitaire, option_vegetarien, commentaire)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.params.id,
            plat.id,
            ligne.id_variante || null,
            ligne.quantite || 1,
            prix,
            Boolean(ligne.option_vegetarien),
            ligne.commentaire || null,
          ]
        );
      }
      await pool.query(
        `UPDATE commandes_client SET total = (
           SELECT COALESCE(SUM(quantite * prix_unitaire), 0) FROM commande_lignes WHERE id_commande = $1
         ) WHERE id = $1`,
        [req.params.id]
      );
    }

    const result = await pool.query(
      `UPDATE commandes_client SET statut = COALESCE($1, statut) WHERE id = $2 RETURNING *`,
      [statut, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Commande introuvable." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    handleDbError(err, res);
  }
});

module.exports = router;
