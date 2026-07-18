let tables = [];
let platsDisponibles = [];
let tableSelectionneeId = null;
let panier = [];

function formatPrix(v) {
  return Number(v).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

async function loadTables() {
  const res = await fetch("/api/tables");
  tables = await res.json();
  renderTables();
}

async function loadMenu() {
  const res = await fetch("/api/menu");
  const categories = await res.json();
  platsDisponibles = categories.flatMap((cat) =>
    cat.plats.map((p) => ({ ...p, categorie_nom: cat.nom }))
  );
  const select = document.getElementById("select-plat");
  select.innerHTML = platsDisponibles
    .map((p) => `<option value="${p.id}">${p.categorie_nom} - ${p.nom}</option>`)
    .join("");
  onPlatChange();
}

function onPlatChange() {
  const idPlat = Number(document.getElementById("select-plat").value);
  const plat = platsDisponibles.find((p) => p.id === idPlat);
  const label = document.getElementById("label-variante");
  const select = document.getElementById("select-variante");
  if (plat && plat.variantes.length > 0) {
    label.hidden = false;
    select.innerHTML = plat.variantes
      .map((v) => `<option value="${v.id}">${v.nom} (${formatPrix(v.prix)})</option>`)
      .join("");
  } else {
    label.hidden = true;
    select.innerHTML = "";
  }
}
document.getElementById("select-plat").addEventListener("change", onPlatChange);

function renderTables() {
  const grille = document.getElementById("tables-grille");
  grille.innerHTML = tables
    .map(
      (t) => `<div class="table-carte ${t.statut} ${t.id === tableSelectionneeId ? "selectionnee" : ""}"
                   onclick="selectionnerTable(${t.id})">
        <div class="numero">${t.numero}</div>
        <div class="statut-label">${t.statut}</div>
      </div>`
    )
    .join("");
}

async function selectionnerTable(id) {
  tableSelectionneeId = id;
  panier = [];
  renderPanierSalle();
  renderTables();
  const table = tables.find((t) => t.id === id);
  document.getElementById("panneau-table").hidden = false;
  document.getElementById("panneau-titre").textContent = "Table " + table.numero;
  await chargerCommandesTable();
}

async function changerStatutTable(statut) {
  await fetch(`/api/tables/${tableSelectionneeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
  await loadTables();
}

let commandeActiveId = null;

async function chargerCommandesTable() {
  const res = await fetch("/api/commandes-client?statut=recu,en_preparation,pret");
  const commandes = await res.json();
  const deLaTable = commandes.filter((c) => c.id_table === tableSelectionneeId);
  commandeActiveId = deLaTable.length > 0 ? deLaTable[0].id : null;

  const container = document.getElementById("commandes-table");
  document.getElementById("empty-commandes-table").hidden = deLaTable.length > 0;
  container.innerHTML = deLaTable
    .map(
      (c) => `<div class="card">
        <span class="badge ${c.statut}">${c.statut}</span> - Total : ${formatPrix(c.total)}
        <ul>${c.lignes
          .map((l) => `<li>${l.quantite} × ${l.plat_nom}${l.variante_nom ? " (" + l.variante_nom + ")" : ""}</li>`)
          .join("")}</ul>
      </div>`
    )
    .join("");
}

function ajouterAuPanier() {
  const idPlat = Number(document.getElementById("select-plat").value);
  const plat = platsDisponibles.find((p) => p.id === idPlat);
  const quantite = Math.max(1, parseInt(document.getElementById("input-quantite").value, 10) || 1);
  const varianteSelect = document.getElementById("select-variante");
  const idVariante =
    plat.variantes.length > 0 && varianteSelect.value ? Number(varianteSelect.value) : null;
  const variante = idVariante ? plat.variantes.find((v) => v.id === idVariante) : null;
  panier.push({
    id_plat: idPlat,
    plat_nom: plat.nom,
    id_variante: idVariante,
    variante_nom: variante ? variante.nom : null,
    quantite,
    prix_unitaire: variante ? variante.prix : plat.prix,
  });
  renderPanierSalle();
}

function renderPanierSalle() {
  const liste = document.getElementById("panier-salle");
  liste.innerHTML = panier
    .map(
      (l, i) => `<li>
        <span>${l.quantite} × ${l.plat_nom}${l.variante_nom ? " (" + l.variante_nom + ")" : ""}</span>
        <span>${formatPrix(l.prix_unitaire * l.quantite)} <button class="small danger" onclick="retirerLigne(${i})">✕</button></span>
      </li>`
    )
    .join("");
}

function retirerLigne(i) {
  panier.splice(i, 1);
  renderPanierSalle();
}

document.getElementById("btn-envoyer-cuisine").addEventListener("click", async () => {
  const errorEl = document.getElementById("error-salle");
  errorEl.hidden = true;
  if (!tableSelectionneeId) {
    errorEl.textContent = "Sélectionne d'abord une table.";
    errorEl.hidden = false;
    return;
  }
  if (panier.length === 0) {
    errorEl.textContent = "Le panier est vide.";
    errorEl.hidden = false;
    return;
  }
  const lignes = panier.map((l) => ({
    id_plat: l.id_plat,
    id_variante: l.id_variante,
    quantite: l.quantite,
  }));

  let res;
  if (commandeActiveId) {
    res = await fetch(`/api/commandes-client/${commandeActiveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ajouter_lignes: lignes }),
    });
  } else {
    res = await fetch("/api/commandes-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "sur_place", id_table: tableSelectionneeId, lignes }),
    });
  }
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  panier = [];
  renderPanierSalle();
  await chargerCommandesTable();
  await changerStatutTable("occupee");
});

(async () => {
  await loadTables();
  await loadMenu();
})();
