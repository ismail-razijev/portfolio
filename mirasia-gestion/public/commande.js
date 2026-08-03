let menu = [];
let tables = [];
let cart = [];
let pollTimer = null;

function formatPrix(v) {
  return Number(v).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

async function loadMenu() {
  const res = await fetch("/api/menu");
  menu = await res.json();
  renderMenu();
}

async function loadTables() {
  const res = await fetch("/api/tables");
  tables = await res.json();
  const select = document.getElementById("select-table");
  select.innerHTML = tables
    .map((t) => `<option value="${t.id}">Table ${t.numero}</option>`)
    .join("");
}

function platPrixLabel(plat) {
  if (plat.variantes.length > 0) {
    return plat.variantes.map((v) => `${v.nom} ${formatPrix(v.prix)}`).join(" / ");
  }
  if (plat.prix === null) return "Prix variable";
  return formatPrix(plat.prix) + (plat.unite === "piece" ? " / pièce" : "");
}

function platCard(plat) {
  const vegBadge =
    plat.vegetarien === "oui"
      ? `<span class="badge vegetarien">Végétarien</span>`
      : plat.vegetarien === "option"
      ? `<span class="badge vegetarien">Option végé</span>`
      : "";
  const surCommandeBadge = plat.sur_commande
    ? `<span class="badge sur-commande">Jeudis Gourmands - sur réservation</span>`
    : "";

  const selectVariante =
    plat.variantes.length > 0
      ? `<select id="variante-${plat.id}">
          ${plat.variantes.map((v) => `<option value="${v.id}">${v.nom} (${formatPrix(v.prix)})</option>`).join("")}
        </select>`
      : "";

  const checkboxVege =
    plat.vegetarien === "option"
      ? `<label style="font-size:0.75rem"><input type="checkbox" id="vege-${plat.id}" /> Version végé</label>`
      : "";

  return `<div class="plat-card">
    <h3>${plat.nom}</h3>
    <div>${vegBadge} ${surCommandeBadge}</div>
    <p class="description">${plat.description || ""}</p>
    <p class="prix">${platPrixLabel(plat)}</p>
    <div class="ligne-ajout">
      ${selectVariante}
      <input type="number" id="qte-${plat.id}" value="1" min="1" style="width:55px" />
      ${checkboxVege}
      <button type="button" onclick="ajouterAuPanier(${plat.id})">Ajouter</button>
    </div>
  </div>`;
}

function renderMenu() {
  const vegOnly = document.getElementById("filtre-vegetarien").checked;
  const container = document.getElementById("menu-categories");
  container.innerHTML = menu
    .map((cat) => {
      const plats = cat.plats.filter((p) => !vegOnly || p.vegetarien !== "non");
      if (plats.length === 0) return "";
      return `<section class="categorie">
        <h2>${cat.nom}</h2>
        <div class="plats-grille">${plats.map(platCard).join("")}</div>
      </section>`;
    })
    .join("");
}

function trouverPlat(idPlat) {
  for (const cat of menu) {
    const p = cat.plats.find((pl) => pl.id === idPlat);
    if (p) return p;
  }
  return null;
}

function ouvrirPanier() {
  document.getElementById("panier").classList.add("ouvert");
}

function fermerPanier() {
  document.getElementById("panier").classList.remove("ouvert");
}

function ajouterAuPanier(idPlat) {
  const plat = trouverPlat(idPlat);
  const qteInput = document.getElementById(`qte-${idPlat}`);
  const quantite = Math.max(1, parseInt(qteInput.value, 10) || 1);
  const varianteSelect = document.getElementById(`variante-${idPlat}`);
  const idVariante = varianteSelect ? Number(varianteSelect.value) : null;
  const variante = idVariante ? plat.variantes.find((v) => v.id === idVariante) : null;
  const vegeCheckbox = document.getElementById(`vege-${idPlat}`);
  const optionVegetarien = vegeCheckbox ? vegeCheckbox.checked : false;
  const prixUnitaire = variante ? variante.prix : plat.prix;

  const existante = cart.find(
    (l) => l.id_plat === idPlat && l.id_variante === idVariante && l.option_vegetarien === optionVegetarien
  );
  if (existante) {
    existante.quantite += quantite;
  } else {
    cart.push({
      id_plat: idPlat,
      plat_nom: plat.nom,
      id_variante: idVariante,
      variante_nom: variante ? variante.nom : null,
      quantite,
      prix_unitaire: prixUnitaire,
      option_vegetarien: optionVegetarien,
    });
  }
  renderPanier();
  ouvrirPanier();
}

function retirerDuPanier(index) {
  cart.splice(index, 1);
  renderPanier();
}

function renderPanier() {
  const liste = document.getElementById("panier-lignes");
  document.getElementById("panier-vide").hidden = cart.length > 0;
  liste.innerHTML = cart
    .map(
      (l, i) => `<li>
        <span>${l.quantite} × ${l.plat_nom}${l.variante_nom ? " (" + l.variante_nom + ")" : ""}${l.option_vegetarien ? " 🌱" : ""}</span>
        <span>${formatPrix(l.prix_unitaire * l.quantite)} <button class="small danger" onclick="retirerDuPanier(${i})">✕</button></span>
      </li>`
    )
    .join("");
  const total = cart.reduce((s, l) => s + l.prix_unitaire * l.quantite, 0);
  document.getElementById("panier-total").textContent = formatPrix(total);

  const nbArticles = cart.reduce((s, l) => s + l.quantite, 0);
  const tab = document.getElementById("panier-tab");
  tab.hidden = cart.length === 0;
  document.getElementById("panier-tab-count").textContent = nbArticles;
  if (cart.length === 0) fermerPanier();
}

document.getElementById("select-mode").addEventListener("change", (e) => {
  document.getElementById("label-table").hidden = e.target.value !== "sur_place";
});

document.getElementById("filtre-vegetarien").addEventListener("change", renderMenu);

document.getElementById("panier-close").addEventListener("click", fermerPanier);
document.getElementById("panier-tab").addEventListener("click", ouvrirPanier);

document.getElementById("btn-commander").addEventListener("click", async () => {
  const errorEl = document.getElementById("error-commande");
  errorEl.hidden = true;
  if (cart.length === 0) {
    errorEl.textContent = "Votre panier est vide.";
    errorEl.hidden = false;
    return;
  }
  const mode = document.getElementById("select-mode").value;
  const idTable = mode === "sur_place" ? Number(document.getElementById("select-table").value) : null;
  if (mode === "sur_place" && !idTable) {
    errorEl.textContent = "Merci de choisir un numéro de table.";
    errorEl.hidden = false;
    return;
  }
  const payload = {
    mode,
    id_table: idTable,
    nom_client: document.getElementById("input-nom").value.trim() || null,
    telephone_client: document.getElementById("input-telephone").value.trim() || null,
    lignes: cart.map((l) => ({
      id_plat: l.id_plat,
      id_variante: l.id_variante,
      quantite: l.quantite,
      option_vegetarien: l.option_vegetarien,
    })),
  };
  const res = await fetch("/api/commandes-client", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  afficherConfirmation(data);
});

function afficherConfirmation(commande) {
  document.getElementById("vue-commande").hidden = true;
  const vue = document.getElementById("vue-confirmation");
  vue.hidden = false;
  document.getElementById("conf-id").textContent = "#" + commande.id;
  document.getElementById("conf-total").textContent = formatPrix(commande.total);
  const jeudiEl = document.getElementById("conf-jeudi");
  if (commande.date_prevue) {
    jeudiEl.hidden = false;
    jeudiEl.textContent =
      "Retrait prévu le jeudi " + new Date(commande.date_prevue).toLocaleDateString("fr-BE");
  } else {
    jeudiEl.hidden = true;
  }
  majStatut(commande.statut);
  pollTimer = setInterval(async () => {
    const res = await fetch(`/api/commandes-client/${commande.id}`);
    if (!res.ok) return;
    const data = await res.json();
    majStatut(data.statut);
    if (data.statut === "servi" || data.statut === "annule") {
      clearInterval(pollTimer);
    }
  }, 8000);
}

function majStatut(statut) {
  const labels = {
    recu: "Reçue",
    en_preparation: "En préparation",
    pret: "Prête",
    servi: "Servie",
    annule: "Annulée",
  };
  const badge = document.getElementById("conf-statut");
  badge.textContent = labels[statut] || statut;
  badge.className = "badge " + statut;
}

document.getElementById("btn-nouvelle-commande").addEventListener("click", () => {
  if (pollTimer) clearInterval(pollTimer);
  cart = [];
  renderPanier();
  document.getElementById("vue-confirmation").hidden = true;
  document.getElementById("vue-commande").hidden = false;
});

(async () => {
  await loadTables();
  await loadMenu();
})();
