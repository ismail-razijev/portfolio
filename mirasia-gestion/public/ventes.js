async function loadPlatsSelect() {
  const res = await fetch("/api/plats");
  const plats = await res.json();
  const select = document.getElementById("select-plat");
  select.innerHTML = plats
    .filter((p) => p.actif)
    .map((p) => `<option value="${p.id}">${echapperHtml(p.nom)}</option>`)
    .join("");
}

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-BE");
}

async function loadVentes() {
  const res = await fetch("/api/commandes");
  const ventes = await res.json();

  const body = document.querySelector("#table-ventes tbody");
  body.innerHTML = ventes
    .map((v) => {
      const total = v.prix_unitaire ? (v.quantite * v.prix_unitaire).toFixed(2) : "-";
      return `<tr>
        <td>${echapperHtml(v.plat_nom)}</td>
        <td>${v.quantite}</td>
        <td>${v.prix_unitaire !== null ? v.prix_unitaire + " €" : "-"}</td>
        <td>${total !== "-" ? total + " €" : "-"}</td>
        <td>${formatDateTime(v.date_commande)}</td>
      </tr>`;
    })
    .join("");
  document.getElementById("empty-ventes").hidden = ventes.length > 0;
}

document.getElementById("form-vente").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    id_plat: form.id_plat.value,
    quantite: form.quantite.value,
  };
  const res = await fetch("/api/commandes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const errorEl = document.getElementById("error-vente");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  form.reset();
  form.quantite.value = 1;
  await loadVentes();
});

(async () => {
  await loadPlatsSelect();
  await loadVentes();
})();
