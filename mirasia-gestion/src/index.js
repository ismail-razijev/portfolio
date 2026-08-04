require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
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

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8h
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
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
