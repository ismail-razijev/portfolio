function formatDateLongue(date) {
  return date.toLocaleDateString("fr-BE", { weekday: "long", day: "numeric", month: "long" });
}

function formatPrix(v) {
  return Number(v).toLocaleString("fr-BE", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " €";
}

const LABEL_STATUT_PREP = { prevue: "Prévue", en_cours: "En cours", terminee: "Terminée" };

function formatCleJour(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderSparkline(dixJours) {
  // dixJours.jour arrive déjà en "AAAA-MM-JJ" (le pilote pg est configuré en
  // amont pour ne pas convertir les colonnes DATE en objet Date, voir
  // src/db/pool.js), donc pas besoin de reparser : on compare directement des
  // clés locales AAAA-MM-JJ des deux côtés.
  const parJour = {};
  dixJours.forEach((d) => {
    parJour[d.jour] = Number(d.chiffre_affaires);
  });

  const jours = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    jours.push(parJour[formatCleJour(d)] || 0);
  }
  const max = Math.max(...jours, 1);

  const sparkline = document.getElementById("dash-sparkline");
  sparkline.innerHTML = jours
    .map((v, i) => {
      const hauteur = Math.max(6, Math.round((v / max) * 100));
      const dernier = i === jours.length - 1;
      return `<div class="dash-spark-bar${dernier ? " dernier" : ""}" style="height:${hauteur}%"></div>`;
    })
    .join("");
}

function renderPreparationsWidget(stats) {
  const terminees = Number(stats.terminees);
  const enCours = Number(stats.en_cours);
  const enRetard = Number(stats.en_retard);
  const total = terminees + enCours + enRetard;

  document.getElementById("dash-prep-valeur").textContent = total;
  const retardEl = document.getElementById("dash-prep-retard");
  if (enRetard > 0) {
    retardEl.textContent = `${enRetard} en retard`;
    retardEl.classList.add("dash-card-sub-alert");
  } else {
    retardEl.textContent = "Aucun retard";
    retardEl.classList.remove("dash-card-sub-alert");
  }

  const segbar = document.getElementById("dash-prep-segbar");
  if (total === 0) {
    segbar.innerHTML = `<div class="dash-seg dash-seg-vide"></div>`;
  } else {
    segbar.innerHTML = `
      <div class="dash-seg dash-seg-terminee" style="flex:${terminees || 0.0001}"></div>
      <div class="dash-seg dash-seg-en-cours" style="flex:${enCours || 0.0001}"></div>
      <div class="dash-seg dash-seg-en-retard" style="flex:${enRetard || 0.0001}"></div>
    `;
  }
  document.getElementById("dash-prep-legend").innerHTML = `
    <span>${terminees} terminée${terminees > 1 ? "s" : ""}</span>
    <span>${enCours} en cours</span>
    <span>${enRetard} en retard</span>
  `;
}

function renderStockWidget(stockBas) {
  document.getElementById("dash-stock-valeur").textContent = stockBas.length;
  document.getElementById("dash-stock-sub").textContent =
    stockBas.length > 0 ? "réassort conseillé" : "Aucune alerte";

  const pills = document.getElementById("dash-stock-pills");
  const noms = stockBas.slice(0, 3).map((s) => `<span class="dash-pill">${echapperHtml(s.plat_nom)}</span>`);
  const reste = stockBas.length - 3;
  if (reste > 0) noms.push(`<span class="dash-pill dash-pill-neutre">+${reste}</span>`);
  pills.innerHTML = noms.join("");
}

function renderStockTable(stockBas) {
  const stockBody = document.querySelector("#table-stock-bas tbody");
  stockBody.innerHTML = stockBas
    .map((s) => {
      const critique = s.seuil_alerte > 0 && s.quantite <= s.seuil_alerte * 0.5;
      return `<tr class="dash-row-alerte ${critique ? "critique" : "attention"}">
        <td><div class="dash-cell-titre">${echapperHtml(s.plat_nom)}</div>${
          s.cuisine_nom ? `<div class="dash-cell-sub">${echapperHtml(s.cuisine_nom)}</div>` : ""
        }</td>
        <td class="num dash-cell-mono ${critique ? "critique" : "attention"}">${s.quantite}</td>
        <td class="num dash-cell-mono-muted">${s.seuil_alerte}</td>
      </tr>`;
    })
    .join("");
  document.getElementById("empty-stock-bas").hidden = stockBas.length > 0;
}

function renderPreparationsTable(preparationsDuJour) {
  const AFFICHAGE_MAX = 5;
  const visibles = preparationsDuJour.slice(0, AFFICHAGE_MAX);

  const prepBody = document.querySelector("#table-preps-jour tbody");
  prepBody.innerHTML = visibles
    .map((p) => {
      const badgeClasse = p.en_retard ? "retard" : p.statut;
      const badgeTexte = p.en_retard ? "En retard" : LABEL_STATUT_PREP[p.statut] || p.statut;
      return `<tr class="${p.en_retard ? "dash-row-retard" : ""}">
        <td>${echapperHtml(p.plat_nom)}</td>
        <td class="num dash-cell-mono">${p.quantite_prevue}</td>
        <td><span class="badge ${badgeClasse}">${badgeTexte}</span></td>
      </tr>`;
    })
    .join("");
  document.getElementById("empty-preps-jour").hidden = preparationsDuJour.length > 0;

  const footer = document.getElementById("dash-preps-footer");
  if (preparationsDuJour.length > 0) {
    footer.hidden = false;
    document.getElementById("dash-preps-footer-text").textContent =
      `${visibles.length} préparation${visibles.length > 1 ? "s" : ""} sur ${preparationsDuJour.length} affichée${visibles.length > 1 ? "s" : ""}`;
  } else {
    footer.hidden = true;
  }
}

async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  const alertesStock = data.totaux.alertes_stock;
  const sousTitre = document.getElementById("dashboard-subtitle");
  const resumeAlertes =
    alertesStock > 0
      ? `${alertesStock} alerte${alertesStock > 1 ? "s" : ""} de stock à traiter`
      : "Aucune alerte de stock";
  sousTitre.textContent = `${formatDateLongue(new Date())} · ${resumeAlertes}`;

  document.getElementById("dash-ventes-valeur").textContent = formatPrix(
    data.ventes.aujourd_hui.chiffre_affaires
  );
  const variationEl = document.getElementById("dash-ventes-variation");
  if (data.ventes.variation_pct === null) {
    variationEl.textContent = `${data.ventes.aujourd_hui.nombre_commandes} commande${Number(data.ventes.aujourd_hui.nombre_commandes) > 1 ? "s" : ""}`;
  } else {
    const signe = data.ventes.variation_pct >= 0 ? "+" : "";
    variationEl.textContent = `${signe}${data.ventes.variation_pct} % vs hier`;
  }
  renderSparkline(data.ventes.dix_jours);

  renderPreparationsWidget(data.preparations_stats);
  renderStockWidget(data.stock_bas);

  renderStockTable(data.stock_bas);
  renderPreparationsTable(data.preparations_du_jour);
}

loadDashboard();
