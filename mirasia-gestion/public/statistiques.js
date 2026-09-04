function formatEuros(n) {
  return Number(n).toFixed(2) + " €";
}

function formatDateCourte(iso) {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "2-digit", month: "2-digit" });
}

// Cette page ne couvre que le module stock surgele (table `commandes`).
// Les ventes du restaurant vivent dans `commandes_client` et s'affichent dans
// « Ventes restaurant » et sur le dashboard. Sans cette precision, une page
// affichant 0 EUR pendant que le dashboard affiche le chiffre du jour se lit
// comme un bug.
async function loadStatistiques() {
  const res = await fetch("/api/statistiques");
  const data = await res.json();

  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = `
    <div class="stat-box"><div class="stat-icon">💶</div><div class="value">${formatEuros(data.totaux.chiffre_affaires_total)}</div><div class="label">Chiffre d'affaires stock surgelé</div></div>
    <div class="stat-box"><div class="stat-icon">🍽️</div><div class="value">${data.totaux.plats_vendus}</div><div class="label">Plats vendus</div></div>
    <div class="stat-box"><div class="stat-icon">🧾</div><div class="value">${data.totaux.nombre_ventes}</div><div class="label">Ventes de stock enregistrées</div></div>
  `;

  const maxVendu = Math.max(1, ...data.top_plats.map((p) => Number(p.total_vendu)));
  const topPlatsEl = document.getElementById("top-plats");
  topPlatsEl.innerHTML = data.top_plats
    .map(
      (p) => `<div class="bar-row">
        <div class="bar-label">${p.plat_nom}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(p.total_vendu / maxVendu) * 100}%"></div></div>
        <div class="bar-value">${p.total_vendu} vendus</div>
      </div>`
    )
    .join("");
  document.getElementById("empty-top-plats").hidden = data.top_plats.length > 0;

  const maxCA = Math.max(1, ...data.ventes_par_jour.map((v) => Number(v.chiffre_affaires)));
  const ventesJourEl = document.getElementById("ventes-jour");
  ventesJourEl.innerHTML = data.ventes_par_jour
    .map(
      (v) => `<div class="bar-row">
        <div class="bar-label">${formatDateCourte(v.jour)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(v.chiffre_affaires / maxCA) * 100}%"></div></div>
        <div class="bar-value">${formatEuros(v.chiffre_affaires)}</div>
      </div>`
    )
    .join("");
  document.getElementById("empty-ventes-jour").hidden = data.ventes_par_jour.length > 0;
}

loadStatistiques();
