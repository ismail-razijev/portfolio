// Tests d'intégration de l'API. Tourne sur une base de données dédiée (mirasia_test),
// jamais sur la base réelle du restaurant. Voir README pour la mise en place.
process.env.DB_NAME = "mirasia_test";
process.env.NODE_ENV = "test";
// Garde-fou indispensable : src/db/pool.js donne la priorité à DATABASE_URL sur
// les variables DB_* ci-dessus. Si cette variable est présente dans
// l'environnement (typiquement pour inspecter la base de production depuis un
// poste local), les tests s'exécuteraient dessus et le TRUNCATE plus bas
// effacerait les vraies données. On la retire donc avant tout require, pool.js
// lisant l'environnement au moment de son chargement.
delete process.env.DATABASE_URL;
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
  // Attend que le compte admin initial soit créé (bootstrap au démarrage de l'app,
  // voir src/db/bootstrapAdmin.js) avant de commencer les tests de login.
  await app.ready;
  // Table de test toujours vide au départ (RESTART IDENTITY remet les compteurs à 1).
  // `users` n'est volontairement pas tronquée : elle contient le compte admin
  // bootstrapé, réutilisé par tous les tests via ADMIN_USERNAME/ADMIN_PASSWORD.
  await pool.query(
    `TRUNCATE commande_lignes, commandes_client, reservations, tables_salle, variantes,
     commandes, stock_mouvements, stock, preparations, plats, categories, cuisines
     RESTART IDENTITY CASCADE`
  );
  // Comptes de rôle créés par les tests ci-dessous : supprimés individuellement
  // (pas de TRUNCATE users) pour ne pas perdre le compte admin bootstrapé.
  await pool.query(`DELETE FROM users WHERE username IN ('test-cuisine', 'test-salle')`);
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

// --- Carte du restaurant, commande client, salle & réservations (V1.3) ---
// Module indépendant du stock surgelé ci-dessus : nouvelles tables/routes,
// mêlant routes publiques (menu, commande, réservation) et protégées (staff).

let categorieId;

test("categories : création (staff)", async () => {
  const res = await agent.post("/api/categories").send({ nom: "Test-Categorie", ordre_affichage: 1 });
  assert.equal(res.status, 201);
  categorieId = res.body.id;
});

let platCarteId;
let platIndisponibleId;

test("plats : création avec les champs de carte (catégorie, description, végétarien...)", async () => {
  const res = await agent.post("/api/plats").send({
    nom: "Test-Plat-Carte",
    id_categorie: categorieId,
    description: "Un plat de test",
    prix: 12,
    vegetarien: "oui",
    unite: "plat",
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.vegetarien, "oui");
  assert.equal(res.body.categorie_nom, undefined); // POST renvoie la ligne brute, pas la jointure
  platCarteId = res.body.id;

  const indispo = await agent.post("/api/plats").send({
    nom: "Test-Plat-Indisponible",
    id_categorie: categorieId,
    prix: 5,
    disponibilite: false,
  });
  platIndisponibleId = indispo.body.id;
});

test("GET /api/menu (public) n'expose que les plats actifs et disponibles", async () => {
  const res = await request(app).get("/api/menu");
  assert.equal(res.status, 200);
  const cat = res.body.find((c) => c.id === categorieId);
  const noms = cat.plats.map((p) => p.nom);
  assert.ok(noms.includes("Test-Plat-Carte"));
  assert.ok(!noms.includes("Test-Plat-Indisponible"));
});

let variantePouletId;

test("variantes : ajout d'une variante à un plat (staff)", async () => {
  const res = await agent
    .post("/api/variantes")
    .send({ id_plat: platCarteId, nom: "Poulet", prix: 15 });
  assert.equal(res.status, 201);
  variantePouletId = res.body.id;

  const liste = await request(app).get(`/api/menu`);
  const cat = liste.body.find((c) => c.id === categorieId);
  const plat = cat.plats.find((p) => p.nom === "Test-Plat-Carte");
  assert.equal(plat.variantes.length, 1);
  assert.equal(plat.variantes[0].nom, "Poulet");
});

let tableId;

test("tables : lecture publique, écriture réservée au staff", async () => {
  const sansAuth = await request(app).get("/api/tables");
  assert.equal(sansAuth.status, 200);

  const creationSansAuth = await request(app).post("/api/tables").send({ numero: "1" });
  assert.equal(creationSansAuth.status, 401);

  const creation = await agent.post("/api/tables").send({ numero: "1", capacite: 4 });
  assert.equal(creation.status, 201);
  assert.equal(creation.body.forme, "carre"); // valeur par défaut
  tableId = creation.body.id;
});

test("tables : plan de salle (forme, position libre, déplacement)", async () => {
  const ronde = await agent
    .post("/api/tables")
    .send({ numero: "2", capacite: 2, forme: "rond", pos_x: 100, pos_y: 60 });
  assert.equal(ronde.status, 201);
  assert.equal(ronde.body.forme, "rond");
  assert.equal(ronde.body.pos_x, 100);
  assert.equal(ronde.body.pos_y, 60);

  const deplacement = await agent
    .patch(`/api/tables/${ronde.body.id}`)
    .send({ pos_x: 250, pos_y: 180 });
  assert.equal(deplacement.status, 200);
  assert.equal(deplacement.body.pos_x, 250);
  assert.equal(deplacement.body.pos_y, 180);
  assert.equal(deplacement.body.forme, "rond"); // inchangée par un déplacement

  const formeInvalide = await agent.post("/api/tables").send({ numero: "3", forme: "triangle" });
  assert.equal(formeInvalide.status, 400);
});

let commandeClientId;

test("commandes-client : création publique, prix recalculé côté serveur", async () => {
  const res = await request(app)
    .post("/api/commandes-client")
    .send({
      mode: "sur_place",
      id_table: tableId,
      lignes: [{ id_plat: platCarteId, id_variante: variantePouletId, quantite: 2 }],
    });
  assert.equal(res.status, 201);
  assert.equal(res.body.total, "30.00"); // 15 x 2, prix de la variante, pas celui envoyé par le client
  commandeClientId = res.body.id;
});

test("commandes-client : le suivi public ne divulgue aucune donnée personnelle", async () => {
  // La route de suivi est ouverte a tous, et l'identifiant de commande est
  // sequentiel : n'importe qui peut donc parcourir /1, /2, /3. Elle ne doit
  // jamais renvoyer le nom ni le telephone du client, sans quoi le carnet
  // d'adresses du restaurant devient lisible par tout le monde.
  const creation = await request(app)
    .post("/api/commandes-client")
    .send({
      mode: "a_emporter",
      nom_client: "Client Temoin",
      telephone_client: "0470 00 00 00",
      lignes: [{ id_plat: platCarteId, id_variante: variantePouletId, quantite: 1 }],
    });
  assert.equal(creation.status, 201);

  const suivi = await request(app).get(`/api/commandes-client/${creation.body.id}`);
  assert.equal(suivi.status, 200);
  assert.equal(suivi.body.statut, "recu"); // le suivi reste fonctionnel
  assert.equal(suivi.body.nom_client, undefined);
  assert.equal(suivi.body.telephone_client, undefined);

  // Le personnel authentifie, lui, doit toujours y avoir acces pour servir le client.
  const cotePersonnel = await agent.get("/api/commandes-client");
  const commande = cotePersonnel.body.find((c) => c.id === creation.body.id);
  assert.equal(commande.nom_client, "Client Temoin");
});

test("commandes-client : refuse un plat indisponible", async () => {
  const res = await request(app)
    .post("/api/commandes-client")
    .send({ mode: "a_emporter", lignes: [{ id_plat: platIndisponibleId, quantite: 1 }] });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /disponible/);
});

test("commandes-client : accès en liste réservé au staff, changement de statut", async () => {
  const sansAuth = await request(app).get("/api/commandes-client");
  assert.equal(sansAuth.status, 401);

  const liste = await agent.get("/api/commandes-client");
  assert.equal(liste.status, 200);
  const commande = liste.body.find((c) => c.id === commandeClientId);
  assert.equal(commande.lignes.length, 1);
  assert.equal(commande.table_numero, "1");

  const patch = await agent
    .patch(`/api/commandes-client/${commandeClientId}`)
    .send({ statut: "en_preparation" });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.statut, "en_preparation");
});

test("commandes-client : ajout d'articles à une commande existante (staff)", async () => {
  const res = await agent
    .patch(`/api/commandes-client/${commandeClientId}`)
    .send({ ajouter_lignes: [{ id_plat: platCarteId, quantite: 1 }] }); // sans variante -> prix de base (12)
  assert.equal(res.status, 200);
  assert.equal(res.body.total, "42.00"); // 30 + 12
});

test("commandes-client : Jeudis Gourmands calcule automatiquement le prochain jeudi", async () => {
  const platJeudi = await agent.post("/api/plats").send({
    nom: "Test-Jeudi-Gourmand",
    id_categorie: categorieId,
    prix: 50,
    sur_commande: true,
  });
  const res = await request(app)
    .post("/api/commandes-client")
    .send({ mode: "a_emporter", lignes: [{ id_plat: platJeudi.body.id, quantite: 1 }] });
  assert.equal(res.status, 201);
  assert.ok(res.body.date_prevue);
  const jour = new Date(res.body.date_prevue + "T12:00:00Z").getUTCDay();
  assert.equal(jour, 4); // jeudi
});

let reservationId;

test("réservations : création publique, liste et confirmation réservées au staff", async () => {
  const creation = await request(app).post("/api/reservations").send({
    nom_client: "Test Client",
    telephone_client: "0470000000",
    date_reservation: "2026-08-15",
    heure_reservation: "19:00",
    nb_personnes: 3,
  });
  assert.equal(creation.status, 201);
  reservationId = creation.body.id;

  const sansAuth = await request(app).get("/api/reservations");
  assert.equal(sansAuth.status, 401);

  const confirmation = await agent
    .patch(`/api/reservations/${reservationId}`)
    .send({ statut: "confirmee", id_table: tableId });
  assert.equal(confirmation.status, 200);
  assert.equal(confirmation.body.statut, "confirmee");
});

// --- Multi-utilisateurs avec rôles (V1.4) ---

let cuisineAgent;
let salleAgent;

test("users : admin peut créer un compte cuisine et un compte salle", async () => {
  const cuisine = await agent.post("/api/users").send({
    username: "test-cuisine",
    password: "test-pass-cuisine",
    role: "cuisine",
  });
  assert.equal(cuisine.status, 201);
  assert.equal(cuisine.body.role, "cuisine");
  assert.equal(cuisine.body.password_hash, undefined); // jamais renvoyé au client

  const salle = await agent.post("/api/users").send({
    username: "test-salle",
    password: "test-pass-salle",
    role: "salle",
  });
  assert.equal(salle.status, 201);
});

test("users : création de compte refusée pour un rôle non-admin (403)", async () => {
  cuisineAgent = request.agent(app);
  const login = await cuisineAgent
    .post("/api/login")
    .send({ username: "test-cuisine", password: "test-pass-cuisine" });
  assert.equal(login.status, 200);
  assert.equal(login.body.role, "cuisine");

  const res = await cuisineAgent.post("/api/users").send({
    username: "intrus",
    password: "x",
    role: "admin",
  });
  assert.equal(res.status, 403);
});

test("rôle cuisine : accès à l'écran cuisine, refus du back-office stock", async () => {
  const commandes = await cuisineAgent.get("/api/commandes-client");
  assert.equal(commandes.status, 200);

  const plats = await cuisineAgent.get("/api/plats");
  assert.equal(plats.status, 403);
});

test("rôle salle : accès aux tables et réservations, refus du back-office et de la compta", async () => {
  salleAgent = request.agent(app);
  await salleAgent
    .post("/api/login")
    .send({ username: "test-salle", password: "test-pass-salle" });

  const table = await salleAgent.patch(`/api/tables/${tableId}`).send({ statut: "occupee" });
  assert.equal(table.status, 200);

  const plats = await salleAgent.get("/api/plats");
  assert.equal(plats.status, 403);

  const stats = await salleAgent.get("/api/commandes-client/statistiques");
  assert.equal(stats.status, 403); // export/statistiques compta réservés à l'admin
});

test("après déconnexion, les routes protégées redeviennent inaccessibles", async () => {
  await agent.post("/api/logout");
  const res = await agent.get("/api/plats");
  assert.equal(res.status, 401);
});
