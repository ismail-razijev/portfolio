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

function estEnRetard(p) {
  if (p.statut === "terminee") return false;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  return p.date_prevue.slice(0, 10) < aujourdhui;
}

const STATUTS = ["prevue", "en_cours", "terminee"];

async function loadPreparations() {
  const res = await fetch("/api/preparations");
  const preps = await res.json();

  const body = document.querySelector("#table-preps tbody");
  body.innerHTML = preps
    .map(
      (p) => `<tr class="${estEnRetard(p) ? "retard" : ""}">
        <td>${p.plat_nom}</td>
        <td>${p.quantite_prevue}</td>
        <td>${formatDate(p.date_prevue)}${estEnRetard(p) ? " ⚠️ en retard" : ""}</td>
        <td>
          <select onchange="updateStatut(${p.id}, this.value)">
            ${STATUTS.map(
              (s) => `<option value="${s}" ${s === p.statut ? "selected" : ""}>${s}</option>`
            ).join("")}
          </select>
        </td>
        <td><button class="danger small" onclick="deletePrep(${p.id})">Supprimer</button></td>
      </tr>`
    )
    .join("");
  document.getElementById("empty-preps").hidden = preps.length > 0;
}

document.getElementById("form-prep").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    id_plat: form.id_plat.value,
    quantite_prevue: form.quantite_prevue.value,
    date_prevue: form.date_prevue.value,
  };
  const res = await fetch("/api/preparations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const errorEl = document.getElementById("error-prep");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  form.reset();
  await loadPreparations();
});

async function updateStatut(id, statut) {
  const res = await fetch(`/api/preparations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
  }
  await loadPreparations();
}

async function deletePrep(id) {
  if (!confirm("Supprimer cette préparation ?")) return;
  const res = await fetch(`/api/preparations/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadPreparations();
}

(async () => {
  await loadPlatsSelect();
  await loadPreparations();
})();
