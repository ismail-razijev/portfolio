async function loadDashboard() {
  const res = await fetch("/api/dashboard");
  const data = await res.json();

  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = `
    <div class="stat-box"><div class="value">${data.totaux.plats_actifs}</div><div class="label">Plats actifs</div></div>
    <div class="stat-box"><div class="value">${data.totaux.alertes_stock}</div><div class="label">Alertes stock</div></div>
    <div class="stat-box"><div class="value">${data.totaux.preparations_en_attente}</div><div class="label">Préparations en attente</div></div>
  `;

  const stockBody = document.querySelector("#table-stock-bas tbody");
  stockBody.innerHTML = data.stock_bas
    .map(
      (s) => `<tr class="alerte"><td>${s.plat_nom}</td><td>${s.quantite}</td><td>${s.seuil_alerte}</td></tr>`
    )
    .join("");
  document.getElementById("empty-stock-bas").hidden = data.stock_bas.length > 0;

  const prepBody = document.querySelector("#table-preps-jour tbody");
  prepBody.innerHTML = data.preparations_du_jour
    .map(
      (p) =>
        `<tr><td>${p.plat_nom}</td><td>${p.quantite_prevue}</td><td><span class="badge ${p.statut}">${p.statut}</span></td></tr>`
    )
    .join("");
  document.getElementById("empty-preps-jour").hidden = data.preparations_du_jour.length > 0;
}

loadDashboard();
