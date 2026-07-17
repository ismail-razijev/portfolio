let cuisines = [];

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

  const select = document.getElementById("select-cuisine");
  select.innerHTML =
    `<option value="">-- aucune --</option>` +
    cuisines.map((c) => `<option value="${c.id}">${c.nom}</option>`).join("");
}

async function loadPlats() {
  const res = await fetch("/api/plats");
  const plats = await res.json();

  const body = document.querySelector("#table-plats tbody");
  body.innerHTML = plats
    .map(
      (p) => `<tr>
        <td>${p.nom}</td>
        <td>${p.cuisine_nom || "-"}</td>
        <td>${p.prix !== null ? p.prix + " €" : "-"}</td>
        <td>${p.actif ? "Oui" : "Non"}</td>
        <td>
          <button class="small" onclick="togglePlat(${p.id}, ${p.actif})">${p.actif ? "Désactiver" : "Activer"}</button>
          <button class="danger small" onclick="deletePlat(${p.id})">Supprimer</button>
        </td>
      </tr>`
    )
    .join("");
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
  await fetch(`/api/plats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif: !actif }),
  });
  await loadPlats();
}

async function deletePlat(id) {
  if (!confirm("Supprimer ce plat ?")) return;
  await fetch(`/api/plats/${id}`, { method: "DELETE" });
  await loadPlats();
}

async function deleteCuisine(id) {
  if (!confirm("Supprimer cette cuisine ?")) return;
  await fetch(`/api/cuisines/${id}`, { method: "DELETE" });
  await loadCuisines();
  await loadPlats();
}

(async () => {
  await loadCuisines();
  await loadPlats();
})();
