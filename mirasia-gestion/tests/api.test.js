// Tests d'intégration de l'API. Tourne sur une base de données dédiée (mirasia_test),
// jamais sur la base réelle du restaurant. Voir README pour la mise en place.
process.env.DB_NAME = "mirasia_test";
process.env.NODE_ENV = "test";
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || "test-admin";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-password";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/index");
const pool = require("../src/db/pool");

const agent = request.agent(app);

before(async () => {
  // Table de test toujours vide au départ (RESTART IDENTITY remet les compteurs à 1)
  await pool.query(
    "TRUNCATE commandes, stock_mouvements, stock, preparations, plats, cuisines RESTART IDENTITY CASCADE"
  );
});

after(async () => {
  await pool.end();
});

test("GET /api/health répond sans authentification", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
});

test("les routes protégées refusent l'accès sans session (401)", async () => {
  const res = await request(app).get("/api/plats");
  assert.equal(res.status, 401);
});

test("le login échoue avec un mauvais mot de passe", async () => {
  const res = await request(app)
    .post("/api/login")
    .send({ username: process.env.ADMIN_USERNAME, password: "mauvais" });
  assert.equal(res.status, 401);
});

test("le login réussit et ouvre une session persistante", async () => {
  const res = await agent.post("/api/login").send({
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });
  assert.equal(res.status, 200);

  const me = await agent.get("/api/me");
  assert.equal(me.body.authenticated, true);
});

let cuisineId;
let platId;

test("créer une cuisine", async () => {
  const res = await agent.post("/api/cuisines").send({ nom: "Test-Cuisine" });
  assert.equal(res.status, 201);
  assert.equal(res.body.nom, "Test-Cuisine");
  cuisineId = res.body.id;
});

test("créer un plat rattaché à la cuisine", async () => {
  const res = await agent
    .post("/api/plats")
    .send({ nom: "Test-Plat", id_cuisine: cuisineId, prix: 10 });
  assert.equal(res.status, 201);
  platId = res.body.id;

  const liste = await agent.get("/api/plats");
  assert.equal(liste.body[0].cuisine_nom, "Test-Cuisine");
});

test("un prix négatif est rejeté par la contrainte CHECK (400)", async () => {
  const res = await agent
    .post("/api/plats")
    .send({ nom: "Invalide", prix: -5 });
  assert.equal(res.status, 400);
});

let stockId;

test("créer une entrée de stock", async () => {
  const res = await agent.post("/api/stock").send({
    id_plat: platId,
    quantite: 10,
    seuil_alerte: 3,
    date_preparation: "2026-07-01",
  });
  assert.equal(res.status, 201);
  stockId = res.body.id;
});

test("une vente décrémente le stock et est tracée dans l'historique", async () => {
  const vente = await agent
    .post("/api/commandes")
    .send({ id_plat: platId, quantite: 4 });
  assert.equal(vente.status, 201);
  assert.equal(vente.body.quantite, 4);
  assert.equal(vente.body.prix_unitaire, "10.00");

  const stock = await agent.get("/api/stock");
  const ligne = stock.body.find((s) => s.id === stockId);
  assert.equal(ligne.quantite, 6);

  const mouvements = await agent.get("/api/stock/mouvements/recentes");
  assert.equal(mouvements.body[0].ancienne_quantite, 10);
  assert.equal(mouvements.body[0].nouvelle_quantite, 6);
});

test("une vente refusée si le stock est insuffisant (400, stock inchangé)", async () => {
  const res = await agent
    .post("/api/commandes")
    .send({ id_plat: platId, quantite: 999 });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /Stock insuffisant/);

  const stock = await agent.get("/api/stock");
  const ligne = stock.body.find((s) => s.id === stockId);
  assert.equal(ligne.quantite, 6);
});

test("le dashboard renvoie les totaux attendus", async () => {
  const res = await agent.get("/api/dashboard");
  assert.equal(res.status, 200);
  assert.ok("totaux" in res.body);
  assert.ok(Array.isArray(res.body.stock_bas));
});

test("les statistiques reflètent la vente enregistrée", async () => {
  const res = await agent.get("/api/statistiques");
  assert.equal(res.status, 200);
  assert.equal(res.body.totaux.nombre_ventes, "1");
  assert.equal(res.body.totaux.chiffre_affaires_total, "40.00");
  assert.equal(res.body.top_plats[0].plat_nom, "Test-Plat");
});

test("suppression d'une cuisine encore utilisée par un plat -> 409", async () => {
  const res = await agent.delete(`/api/cuisines/${cuisineId}`);
  assert.equal(res.status, 409);
});

test("après déconnexion, les routes protégées redeviennent inaccessibles", async () => {
  await agent.post("/api/logout");
  const res = await agent.get("/api/plats");
  assert.equal(res.status, 401);
});
