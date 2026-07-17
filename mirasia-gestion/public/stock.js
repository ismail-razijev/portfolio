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

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-BE");
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
  document.getElementById("empty-stock").hidden = stock.length > 0;
}

async function loadMouvements() {
  const res = await fetch("/api/stock/mouvements/recentes");
  const mouvements = await res.json();

  const body = document.querySelector("#table-mouvements tbody");
  body.innerHTML = mouvements
    .map(
      (m) => `<tr>
        <td>${m.plat_nom}</td>
        <td>${m.ancienne_quantite}</td>
        <td>${m.nouvelle_quantite}</td>
        <td>${formatDateTime(m.date_mouvement)}</td>
      </tr>`
    )
    .join("");
  document.getElementById("empty-mouvements").hidden = mouvements.length > 0;
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
  const res = await fetch(`/api/stock/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantite }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
  }
  await loadStock();
  await loadMouvements();
}

async function deleteStock(id) {
  if (!confirm("Supprimer cette ligne de stock ?")) return;
  const res = await fetch(`/api/stock/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadStock();
}

(async () => {
  await loadPlatsSelect();
  await loadStock();
  await loadMouvements();
})();
