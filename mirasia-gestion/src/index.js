require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const pool = require("./db/pool");
const { requireRole } = require("./middleware/auth");
const { bootstrapAdmin } = require("./db/bootstrapAdmin");

const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const cuisinesRouter = require("./routes/cuisines");
const platsRouter = require("./routes/plats");
const stockRouter = require("./routes/stock");
const preparationsRouter = require("./routes/preparations");
const commandesRouter = require("./routes/commandes");
const statistiquesRouter = require("./routes/statistiques");
const dashboardRouter = require("./routes/dashboard");
const categoriesRouter = require("./routes/categories");
const variantesRouter = require("./routes/variantes");
const menuRouter = require("./routes/menu");
const tablesRouter = require("./routes/tables");
const commandesClientRouter = require("./routes/commandesClient");
const reservationsRouter = require("./routes/reservations");

const app = express();

// Render (comme Heroku ou Fly) termine le HTTPS sur son proxy et parle ensuite
// a l'application en HTTP. Sans cette ligne, Express croit servir du HTTP en
// clair et refuse de poser un cookie marque `secure` : plus personne ne peut se
// connecter. Elle est donc indissociable du `secure` configure plus bas.
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan("dev", { skip: () => process.env.NODE_ENV === "test" }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Les sessions sont stockees en base, pas en memoire.
//
// Le magasin par defaut d'express-session garde tout dans la memoire du
// processus. Il previent lui-meme qu'il ne convient pas a la production, pour
// deux raisons qui se voient ici : la memoire n'est jamais liberee, et surtout
// tout le monde est deconnecte a chaque redemarrage. Sur l'offre gratuite de
// Render, l'instance s'endort des qu'elle n'est plus sollicitee : chaque reveil
// vidait donc les sessions en cours.
//
// La table est creee automatiquement au premier demarrage (createTableIfMissing),
// ce qui evite une migration a passer a la main sur Supabase. Les sessions
// expirees sont purgees periodiquement par la bibliotheque.
app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8, // 8h
      httpOnly: true, // deja le defaut, ecrit pour que l'intention soit lisible
      // Le cookie ne part que sur une connexion chiffree. Conditionne a
      // l'environnement : en developpement local on sert en HTTP, un cookie
      // `secure` ne serait jamais pose et la connexion echouerait.
      secure: process.env.NODE_ENV === "production",
      // Le cookie n'accompagne pas les requetes declenchees depuis un autre
      // site, ce qui coupe les attaques CSRF les plus simples. "lax" et non
      // "strict" pour qu'un lien externe vers l'application garde la session.
      sameSite: "lax",
    },
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    // Route publique : le message d'erreur PostgreSQL brut renseignerait un
    // inconnu sur l'infrastructure (hote, utilisateur, nom de base). On journalise
    // le detail cote serveur et on ne renvoie qu'un statut. Le code 500 suffit au
    // healthcheck de Render et au workflow keep-alive pour detecter la panne.
    console.error("healthcheck en echec :", err);
    res.status(500).json({ status: "error" });
  }
});

app.use("/api", authRouter);

// Back-office stock surgelé + carte + comptes : réservé au rôle admin (V1.4).
app.use("/api/users", requireRole("admin"), usersRouter);
app.use("/api/cuisines", requireRole("admin"), cuisinesRouter);
app.use("/api/plats", requireRole("admin"), platsRouter);
app.use("/api/stock", requireRole("admin"), stockRouter);
app.use("/api/preparations", requireRole("admin"), preparationsRouter);
app.use("/api/commandes", requireRole("admin"), commandesRouter);
app.use("/api/statistiques", requireRole("admin"), statistiquesRouter);
app.use("/api/dashboard", requireRole("admin"), dashboardRouter);
app.use("/api/categories", requireRole("admin"), categoriesRouter);
app.use("/api/variantes", requireRole("admin"), variantesRouter);

// Carte du restaurant, commande client, salle & réservations (V1.3).
// commandesClientRouter, tablesRouter et reservationsRouter appliquent
// requireRole route par route en interne (POST/GET publics, reste réservé
// au staff avec un rôle précis) : seuls modules de l'app où le même routeur
// sert à la fois du public et du staff.
app.use("/api/menu", menuRouter);
app.use("/api/tables", tablesRouter);
app.use("/api/commandes-client", commandesClientRouter);
app.use("/api/reservations", reservationsRouter);

const readyPromise = bootstrapAdmin().catch((err) => {
  console.error("Erreur lors du bootstrap du compte admin :", err.message);
});

if (require.main === module) {
  readyPromise.then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Serveur lancé sur http://localhost:${port}`);
    });
  });
}

module.exports = app;
module.exports.ready = readyPromise;
