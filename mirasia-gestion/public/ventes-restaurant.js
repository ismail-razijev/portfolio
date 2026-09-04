function formatPrix(v) {
  return Number(v).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

async function loadStatistiques() {
  const res = await fetch("/api/commandes-client/statistiques");
  const data = await res.json();

  document.getElementById("stat-ca").textContent = formatPrix(data.totaux.chiffre_affaires);
  document.getElementById("stat-nb").textContent = data.totaux.nombre_commandes;

  document.getElementById("empty-top-plats").hidden = data.top_plats.length > 0;
  document.querySelector("#table-top-plats tbody").innerHTML = data.top_plats
    .map((p) => `<tr><td>${echapperHtml(p.plat_nom)}</td><td>${p.quantite_vendue}</td></tr>`)
    .join("");

  document.querySelector("#table-categories-ca tbody").innerHTML = data.chiffre_par_categorie
    .map((c) => `<tr><td>${echapperHtml(c.categorie_nom || "-")}</td><td>${formatPrix(c.chiffre_affaires)}</td></tr>`)
    .join("");
}

document.getElementById("form-export").addEventListener("submit", (e) => {
  e.preventDefault();
  const date = document.getElementById("export-date").value;
  const url = "/api/commandes-client/export.csv" + (date ? `?date=${date}` : "");
  window.location.href = url;
});

loadStatistiques();
