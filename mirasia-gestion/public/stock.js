async function loadPlatsSelect() {
  const res = await fetch("/api/plats");
  const plats = await res.json();
  const select = document.getElementById("select-plat");
  select.innerHTML = plats
    .map((p) => `<option value="${p.id}">${p.nom}</option>`)
    .join("");
}

function formatDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("fr-BE");
}

async function loadStock() {
  const res = await fetch("/api/stock");
  const stock = await res.json();

  const body = document.querySelector("#table-stock tbody");
  body.innerHTML = stock
    .map((s) => {
      const alerte = s.quantite <= s.seuil_alerte;
      return `<tr class="${alerte ? "alerte" : ""}">
        <td>${s.plat_nom}</td>
        <td>
          <input type="number" min="0" value="${s.quantite}" style="width:70px"
                 onchange="updateQuantite(${s.id}, this.value)" />
        </td>
        <td>${s.seuil_alerte}</td>
        <td>${formatDate(s.date_preparation)}</td>
        <td>${formatDate(s.date_peremption)}</td>
        <td><button class="danger small" onclick="deleteStock(${s.id})">Supprimer</button></td>
      </tr>`;
    })
    .join("");
}

document.getElementById("form-stock").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    id_plat: form.id_plat.value,
    quantite: form.quantite.value,
    seuil_alerte: form.seuil_alerte.value,
    date_preparation: form.date_preparation.value,
    date_peremption: form.date_peremption.value || null,
  };
  const res = await fetch("/api/stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const errorEl = document.getElementById("error-stock");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  form.reset();
  await loadStock();
});

async function updateQuantite(id, quantite) {
  await fetch(`/api/stock/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantite }),
  });
  await loadStock();
}

async function deleteStock(id) {
  if (!confirm("Supprimer cette ligne de stock ?")) return;
  await fetch(`/api/stock/${id}`, { method: "DELETE" });
  await loadStock();
}

(async () => {
  await loadPlatsSelect();
  await loadStock();
})();
