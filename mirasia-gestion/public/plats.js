let cuisines = [];
let plats = [];
let editingPlatId = null;

async function loadCuisines() {
  const res = await fetch("/api/cuisines");
  cuisines = await res.json();

  const body = document.querySelector("#table-cuisines tbody");
  body.innerHTML = cuisines
    .map(
      (c) => `<tr>
        <td>${c.nom}</td>
        <td><button class="danger small" onclick="deleteCuisine(${c.id})">Supprimer</button></td>
      </tr>`
    )
    .join("");
  document.getElementById("empty-cuisines").hidden = cuisines.length > 0;

  const select = document.getElementById("select-cuisine");
  select.innerHTML =
    `<option value="">-- aucune --</option>` +
    cuisines.map((c) => `<option value="${c.id}">${c.nom}</option>`).join("");

  const filtre = document.getElementById("filtre-cuisine");
  filtre.innerHTML =
    `<option value="">Toutes</option>` +
    cuisines.map((c) => `<option value="${c.id}">${c.nom}</option>`).join("");
}

function filteredPlats() {
  const recherche = document.getElementById("filtre-recherche").value.trim().toLowerCase();
  const cuisineId = document.getElementById("filtre-cuisine").value;
  return plats.filter((p) => {
    const matchNom = !recherche || p.nom.toLowerCase().includes(recherche);
    const matchCuisine = !cuisineId || String(p.id_cuisine) === cuisineId;
    return matchNom && matchCuisine;
  });
}

function cuisineOptions(selectedId) {
  return (
    `<option value="">-- aucune --</option>` +
    cuisines
      .map(
        (c) =>
          `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${c.nom}</option>`
      )
      .join("")
  );
}

function renderPlatRow(p) {
  if (p.id === editingPlatId) {
    return `<tr>
      <td><input type="text" id="edit-nom-${p.id}" value="${p.nom}" /></td>
      <td><select id="edit-cuisine-${p.id}">${cuisineOptions(p.id_cuisine)}</select></td>
      <td><input type="number" id="edit-prix-${p.id}" step="0.01" min="0" value="${p.prix ?? ""}" style="width:80px" /></td>
      <td>${p.actif ? "Oui" : "Non"}</td>
      <td>
        <button class="small" onclick="savePlat(${p.id})">Enregistrer</button>
        <button class="small" onclick="cancelEditPlat()">Annuler</button>
      </td>
    </tr>`;
  }
  return `<tr>
    <td>${p.nom}</td>
    <td>${p.cuisine_nom || "-"}</td>
    <td>${p.prix !== null ? p.prix + " €" : "-"}</td>
    <td>${p.actif ? "Oui" : "Non"}</td>
    <td>
      <button class="small" onclick="startEditPlat(${p.id})">Modifier</button>
      <button class="small" onclick="togglePlat(${p.id}, ${p.actif})">${p.actif ? "Désactiver" : "Activer"}</button>
      <button class="danger small" onclick="deletePlat(${p.id})">Supprimer</button>
    </td>
  </tr>`;
}

function renderPlatsTable() {
  const visibles = filteredPlats();
  const body = document.querySelector("#table-plats tbody");
  body.innerHTML = visibles.map(renderPlatRow).join("");
  document.getElementById("empty-plats").hidden = visibles.length > 0;
}

async function loadPlats() {
  const res = await fetch("/api/plats");
  plats = await res.json();
  renderPlatsTable();
}

document.getElementById("filtre-recherche").addEventListener("input", renderPlatsTable);
document.getElementById("filtre-cuisine").addEventListener("change", renderPlatsTable);
document.getElementById("form-filtres-plats").addEventListener("submit", (e) => e.preventDefault());

function startEditPlat(id) {
  editingPlatId = id;
  loadPlats();
}

function cancelEditPlat() {
  editingPlatId = null;
  loadPlats();
}

async function savePlat(id) {
  const nom = document.getElementById(`edit-nom-${id}`).value.trim();
  const id_cuisine = document.getElementById(`edit-cuisine-${id}`).value || null;
  const prix = document.getElementById(`edit-prix-${id}`).value || null;

  const res = await fetch(`/api/plats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, id_cuisine, prix }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  editingPlatId = null;
  await loadPlats();
}

document.getElementById("form-cuisine").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nom = e.target.nom.value.trim();
  const res = await fetch("/api/cuisines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom }),
  });
  const errorEl = document.getElementById("error-cuisine");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  e.target.reset();
  await loadCuisines();
});

document.getElementById("form-plat").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nom = e.target.nom.value.trim();
  const id_cuisine = e.target.id_cuisine.value || null;
  const prix = e.target.prix.value || null;
  const res = await fetch("/api/plats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, id_cuisine, prix }),
  });
  const errorEl = document.getElementById("error-plat");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  e.target.reset();
  await loadPlats();
});

async function togglePlat(id, actif) {
  const res = await fetch(`/api/plats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif: !actif }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadPlats();
}

async function deletePlat(id) {
  if (!confirm("Supprimer ce plat ?")) return;
  const res = await fetch(`/api/plats/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadPlats();
}

async function deleteCuisine(id) {
  if (!confirm("Supprimer cette cuisine ?")) return;
  const res = await fetch(`/api/cuisines/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadCuisines();
  await loadPlats();
}

(async () => {
  await loadCuisines();
  await loadPlats();
})();
