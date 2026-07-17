require("dotenv").config();
const express = require("express");
const pool = require("./db/pool");

const cuisinesRouter = require("./routes/cuisines");
const platsRouter = require("./routes/plats");
const stockRouter = require("./routes/stock");
const preparationsRouter = require("./routes/preparations");
const dashboardRouter = require("./routes/dashboard");

const app = express();
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use("/api/cuisines", cuisinesRouter);
app.use("/api/plats", platsRouter);
app.use("/api/stock", stockRouter);
app.use("/api/preparations", preparationsRouter);
app.use("/api/dashboard", dashboardRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});
