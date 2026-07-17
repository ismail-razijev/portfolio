require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const pool = require("./db/pool");
const { requireAuth } = require("./middleware/auth");

const authRouter = require("./routes/auth");
const cuisinesRouter = require("./routes/cuisines");
const platsRouter = require("./routes/plats");
const stockRouter = require("./routes/stock");
const preparationsRouter = require("./routes/preparations");
const commandesRouter = require("./routes/commandes");
const statistiquesRouter = require("./routes/statistiques");
const dashboardRouter = require("./routes/dashboard");

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

app.use("/api/cuisines", requireAuth, cuisinesRouter);
app.use("/api/plats", requireAuth, platsRouter);
app.use("/api/stock", requireAuth, stockRouter);
app.use("/api/preparations", requireAuth, preparationsRouter);
app.use("/api/commandes", requireAuth, commandesRouter);
app.use("/api/statistiques", requireAuth, statistiquesRouter);
app.use("/api/dashboard", requireAuth, dashboardRouter);

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
  });
}

module.exports = app;
