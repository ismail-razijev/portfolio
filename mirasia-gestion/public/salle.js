let tables = [];
let platsDisponibles = [];
let tableSelectionneeId = null;
let panier = [];
let editMode = false;
let categorieActive = null;

function formatPrix(v) {
  return Number(v).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatHeure(dateIso) {
  return new Date(dateIso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
}

// Durée écoulée depuis occupee_depuis (posé côté serveur au changement de
// statut, voir src/routes/tables.js), affichée directement sur le plan comme
// dans la maquette ("42 min", "1 h 05") plutôt qu'une donnée inventée.
function formatDuree(depuisIso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(depuisIso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

async function loadTables() {
  const res = await fetch("/api/tables");
  tables = await res.json();
  renderPlanSalle();
  renderHeaderSalle();
}

function renderHeaderSalle() {
  const occupees = tables.filter((t) => t.statut === "occupee");
  const couverts = occupees.reduce((s, t) => s + t.capacite, 0);
  const heure = new Date().getHours();
  const service = heure < 15 ? "Service de midi" : "Service du soir";
  document.getElementById("salle-subtitle").textContent =
    `${service} · ${occupees.length} table${occupees.length > 1 ? "s" : ""} occupée${occupees.length > 1 ? "s" : ""} sur ${tables.length} · ${couverts} couvert${couverts > 1 ? "s" : ""}`;
}

async function loadMenu() {
  const res = await fetch("/api/menu");
  const categories = await res.json();
  platsDisponibles = categories.flatMap((cat) =>
    cat.plats.map((p) => ({ ...p, categorie_nom: cat.nom }))
  );
  renderCategoriesFilter();
  renderSelectPlat();
}

function renderCategoriesFilter() {
  const noms = [...new Set(platsDisponibles.map((p) => p.categorie_nom))];
  const container = document.getElementById("panneau-categories");
  const pill = (label, valeur) =>
    `<span class="panneau-pill ${categorieActive === valeur ? "active" : ""}" onclick="filtrerCategorie(${valeur === null ? "null" : `'${valeur}'`})">${label}</span>`;
  container.innerHTML = pill("Toutes", null) + noms.map((n) => pill(n, n)).join("");
}

function filtrerCategorie(nom) {
  categorieActive = nom;
  renderCategoriesFilter();
  renderSelectPlat();
}

function renderSelectPlat() {
  const select = document.getElementById("select-plat");
  const visibles = categorieActive
    ? platsDisponibles.filter((p) => p.categorie_nom === categorieActive)
    : platsDisponibles;
  select.innerHTML = visibles
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

// --- Plan de salle : rendu, sélection, édition (V1.5), infos vivantes (V8) ---

function renderPlanSalle() {
  const plan = document.getElementById("plan-salle");
  document.getElementById("empty-tables").hidden = tables.length > 0;
  plan.classList.toggle("edition", editMode);

  plan.innerHTML = tables
    .map((t) => {
      let infoLigne = `<span class="capacite-label">${t.capacite} pers.</span>`;
      if (t.statut === "occupee" && t.occupee_depuis) {
        infoLigne = `<span class="table-info">${formatDuree(t.occupee_depuis)}</span>`;
      } else if (t.statut === "reservee" && t.heure_reservation) {
        infoLigne = `<span class="table-info">Rés. ${t.heure_reservation.slice(0, 5)}${t.reservation_client ? " · " + t.reservation_client : ""}</span>`;
      }
      return `<div class="table-forme ${t.forme} ${t.statut} ${t.id === tableSelectionneeId ? "selectionnee" : ""}"
           id="table-forme-${t.id}"
           style="left:${t.pos_x}px; top:${t.pos_y}px">
        ${
          editMode
            ? `<div class="table-outils">
                <button type="button" class="small" onclick="editerTable(${t.id})">✎</button>
                <button type="button" class="small danger" onclick="supprimerTable(${t.id})">✕</button>
              </div>`
            : ""
        }
        <span class="numero">${t.numero}</span>
        ${infoLigne}
      </div>`;
    })
    .join("");

  tables.forEach((t) => {
    const el = document.getElementById(`table-forme-${t.id}`);
    if (editMode) {
      attacherDrag(el, t);
    } else {
      el.addEventListener("click", () => selectionnerTable(t.id));
    }
  });
}

// Rafraîchit uniquement les durées affichées, sans re-fetch : léger, appelé
// chaque minute pour que "42 min" reste juste pendant tout le service.
function rafraichirDurees() {
  if (editMode) return;
  tables
    .filter((t) => t.statut === "occupee" && t.occupee_depuis)
    .forEach((t) => {
      const el = document.querySelector(`#table-forme-${t.id} .table-info`);
      if (el) el.textContent = formatDuree(t.occupee_depuis);
    });
}
setInterval(rafraichirDurees, 60000);

function attacherDrag(el, table) {
  const SEUIL = 5;

  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".table-outils")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = table.pos_x;
    const origY = table.pos_y;
    let dragging = false;
    let nx = origX;
    let ny = origY;
    el.setPointerCapture(e.pointerId);

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) > SEUIL) {
        dragging = true;
        el.classList.add("en-glissement");
      }
      if (dragging) {
        const plan = document.getElementById("plan-salle");
        const maxX = plan.clientWidth - el.offsetWidth;
        const maxY = plan.clientHeight - el.offsetHeight;
        nx = Math.max(0, Math.min(maxX, origX + dx));
        ny = Math.max(0, Math.min(maxY, origY + dy));
        el.style.left = nx + "px";
        el.style.top = ny + "px";
      }
    }

    async function onUp(ev) {
      el.releasePointerCapture(ev.pointerId);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.classList.remove("en-glissement");
      if (dragging) {
        table.pos_x = Math.round(nx);
        table.pos_y = Math.round(ny);
        await fetch(`/api/tables/${table.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pos_x: table.pos_x, pos_y: table.pos_y }),
        });
      }
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  });
}

document.getElementById("btn-toggle-edit").addEventListener("click", () => {
  editMode = !editMode;
  document.getElementById("btn-toggle-edit").textContent = editMode
    ? "Terminer l'édition"
    : "Éditer le plan";
  document.getElementById("plan-edition-outils").hidden = !editMode;
  document.getElementById("plan-aide").hidden = !editMode;
  renderPlanSalle();
});

async function ajouterTable(forme) {
  const numero = prompt("Numéro de la table :", String(tables.length + 1));
  if (!numero) return;
  const capaciteStr = prompt("Capacité (nombre de personnes) :", "4");
  if (capaciteStr === null) return;
  const capacite = parseInt(capaciteStr, 10) || 4;
  const pos_x = 20 + (tables.length % 8) * 90;
  const pos_y = 20 + Math.floor(tables.length / 8) * 90;

  const res = await fetch("/api/tables", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, capacite, forme, pos_x, pos_y }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadTables();
}

async function editerTable(id) {
  const table = tables.find((t) => t.id === id);
  const numero = prompt("Numéro de la table :", table.numero);
  if (numero === null) return;
  const capaciteStr = prompt("Capacité (nombre de personnes) :", table.capacite);
  if (capaciteStr === null) return;
  const capacite = parseInt(capaciteStr, 10) || table.capacite;

  const res = await fetch(`/api/tables/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numero, capacite }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadTables();
}

async function supprimerTable(id) {
  if (!confirm("Supprimer cette table ?")) return;
  const res = await fetch(`/api/tables/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  if (tableSelectionneeId === id) {
    tableSelectionneeId = null;
    document.getElementById("panneau-table").hidden = true;
  }
  await loadTables();
}

// --- Prise de commande sur une table sélectionnée ---

async function selectionnerTable(id) {
  tableSelectionneeId = id;
  panier = [];
  renderPanierSalle();
  renderPlanSalle();
  const table = tables.find((t) => t.id === id);
  document.getElementById("panneau-table").hidden = false;
  document.getElementById("panneau-titre").textContent = "Table " + table.numero;

  let meta = `${table.capacite} couverts`;
  if (table.statut === "occupee" && table.occupee_depuis) {
    meta += ` · ouverte à ${formatHeure(table.occupee_depuis)}`;
  } else if (table.statut === "reservee" && table.heure_reservation) {
    meta += ` · réservée ${table.heure_reservation.slice(0, 5)}${table.reservation_client ? " pour " + table.reservation_client : ""}`;
  }
  document.getElementById("panneau-meta").textContent = meta;

  await chargerCommandesTable();
}

async function changerStatutTable(statut) {
  await fetch(`/api/tables/${tableSelectionneeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
  await loadTables();
  const table = tables.find((t) => t.id === tableSelectionneeId);
  if (table) {
    let meta = `${table.capacite} couverts`;
    if (table.statut === "occupee" && table.occupee_depuis) {
      meta += ` · ouverte à ${formatHeure(table.occupee_depuis)}`;
    } else if (table.statut === "reservee" && table.heure_reservation) {
      meta += ` · réservée ${table.heure_reservation.slice(0, 5)}${table.reservation_client ? " pour " + table.reservation_client : ""}`;
    }
    document.getElementById("panneau-meta").textContent = meta;
  }
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
    vegetarien: plat.vegetarien,
    sur_commande: plat.sur_commande,
    quantite,
    prix_unitaire: variante ? variante.prix : plat.prix,
  });
  renderPanierSalle();
}

function renderPanierSalle() {
  const liste = document.getElementById("panier-salle");
  liste.innerHTML = panier
    .map((l, i) => {
      let sousTitre = "";
      if (l.variante_nom) {
        sousTitre = `<div class="panier-sub">${l.variante_nom}</div>`;
      } else if (l.sur_commande || (l.vegetarien && l.vegetarien !== "non")) {
        const badges = [];
        if (l.sur_commande) badges.push(`<span class="badge sur-commande">Sur commande</span>`);
        if (l.vegetarien && l.vegetarien !== "non") badges.push(`<span class="badge vegetarien">Végétarien</span>`);
        sousTitre = `<div class="panier-sub">${badges.join(" ")}</div>`;
      }
      return `<li>
        <span class="panier-qte">${l.quantite}</span>
        <div class="panier-detail">
          <div class="panier-nom">${l.plat_nom}</div>
          ${sousTitre}
        </div>
        <span class="panier-prix">${formatPrix(l.prix_unitaire * l.quantite)}</span>
        <button type="button" class="small danger" onclick="retirerLigne(${i})">✕</button>
      </li>`;
    })
    .join("");
  const total = panier.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);
  document.getElementById("panneau-total").textContent = formatPrix(total);
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

// Encaisser : clôture la commande active (statut -> servi) et libère la
// table (statut -> libre, ce qui efface occupee_depuis côté serveur). Pas de
// paiement réel géré ici (pas de terminal/API bancaire dans ce projet) : le
// bouton reflète la clôture du service pour cette table.
document.getElementById("btn-encaisser").addEventListener("click", async () => {
  const errorEl = document.getElementById("error-salle");
  errorEl.hidden = true;
  if (!tableSelectionneeId) return;
  if (!commandeActiveId) {
    errorEl.textContent = "Aucune commande en cours à encaisser pour cette table.";
    errorEl.hidden = false;
    return;
  }
  if (!confirm("Encaisser et libérer cette table ?")) return;
  await fetch(`/api/commandes-client/${commandeActiveId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut: "servi" }),
  });
  commandeActiveId = null;
  panier = [];
  renderPanierSalle();
  await chargerCommandesTable();
  await changerStatutTable("libre");
});

(async () => {
  await loadTables();
  await loadMenu();
})();
