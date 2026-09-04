let categories = [];
let platsMenu = [];
let editingPlatId = null;
let variantePlatId = null;

async function loadCategories() {
  const res = await fetch("/api/categories");
  categories = await res.json();

  document.querySelector("#table-categories tbody").innerHTML = categories
    .map(
      (c) => `<tr>
        <td>${echapperHtml(c.nom)}</td>
        <td>${c.ordre_affichage}</td>
        <td><button class="danger small" onclick="deleteCategorie(${c.id})">Supprimer</button></td>
      </tr>`
    )
    .join("");

  const select = document.getElementById("select-categorie");
  select.innerHTML = categories.map((c) => `<option value="${c.id}">${echapperHtml(c.nom)}</option>`).join("");
}

function categorieNom(id) {
  const c = categories.find((cat) => cat.id === id);
  return c ? c.nom : "-";
}

function categorieOptions(selectedId) {
  return categories
    .map((c) => `<option value="${c.id}" ${c.id === selectedId ? "selected" : ""}>${echapperHtml(c.nom)}</option>`)
    .join("");
}

async function loadPlatsMenu() {
  const res = await fetch("/api/plats");
  const tous = await res.json();
  platsMenu = tous.filter((p) => p.id_categorie !== null);
  renderPlatsMenu();
}

function renderPlatRow(p) {
  if (p.id === editingPlatId) {
    return `<tr>
      <td><input type="text" id="edit-nom-${p.id}" value="${echapperHtml(p.nom)}" /></td>
      <td><select id="edit-categorie-${p.id}">${categorieOptions(p.id_categorie)}</select></td>
      <td><input type="number" id="edit-prix-${p.id}" step="0.01" min="0" value="${p.prix ?? ""}" style="width:80px" /></td>
      <td>
        <select id="edit-vegetarien-${p.id}">
          <option value="non" ${p.vegetarien === "non" ? "selected" : ""}>Non</option>
          <option value="oui" ${p.vegetarien === "oui" ? "selected" : ""}>Oui</option>
          <option value="option" ${p.vegetarien === "option" ? "selected" : ""}>Option</option>
        </select>
      </td>
      <td>${p.disponibilite ? "Oui" : "Non"}</td>
      <td>${p.actif ? "Oui" : "Non"}</td>
      <td>
        <button class="small" onclick="savePlatMenu(${p.id})">Enregistrer</button>
        <button class="small" onclick="cancelEditPlatMenu()">Annuler</button>
      </td>
    </tr>`;
  }
  return `<tr>
    <td>${echapperHtml(p.nom)}${p.sur_commande ? ' <span class="badge sur-commande">Jeudi</span>' : ""}</td>
    <td>${categorieNom(p.id_categorie)}</td>
    <td>${p.prix !== null ? p.prix + " €" : "variantes"}</td>
    <td>${p.vegetarien}</td>
    <td>${p.disponibilite ? "Oui" : "Non"}</td>
    <td>${p.actif ? "Oui" : "Non"}</td>
    <td>
      <button class="small" onclick="startEditPlatMenu(${p.id})">Modifier</button>
      <button class="small" onclick="toggleDisponibilite(${p.id}, ${p.disponibilite})">${p.disponibilite ? "Rupture" : "Dispo"}</button>
      <button class="small" onclick="toggleActifPlat(${p.id}, ${p.actif})">${p.actif ? "Désactiver" : "Activer"}</button>
      <button class="small" onclick="ouvrirVariantes(${p.id})">Variantes</button>
      <button class="danger small" onclick="deletePlatMenu(${p.id})">Supprimer</button>
    </td>
  </tr>`;
}

function renderPlatsMenu() {
  document.querySelector("#table-plats-menu tbody").innerHTML = platsMenu.map(renderPlatRow).join("");
}

function startEditPlatMenu(id) {
  editingPlatId = id;
  renderPlatsMenu();
}

function cancelEditPlatMenu() {
  editingPlatId = null;
  renderPlatsMenu();
}

async function savePlatMenu(id) {
  const nom = document.getElementById(`edit-nom-${id}`).value.trim();
  const id_categorie = document.getElementById(`edit-categorie-${id}`).value || null;
  const prix = document.getElementById(`edit-prix-${id}`).value || null;
  const vegetarien = document.getElementById(`edit-vegetarien-${id}`).value;
  const res = await fetch(`/api/plats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, id_categorie, prix, vegetarien }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  editingPlatId = null;
  await loadPlatsMenu();
}

async function toggleDisponibilite(id, dispo) {
  await fetch(`/api/plats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disponibilite: !dispo }),
  });
  await loadPlatsMenu();
}

async function toggleActifPlat(id, actif) {
  await fetch(`/api/plats/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif: !actif }),
  });
  await loadPlatsMenu();
}

async function deletePlatMenu(id) {
  if (!confirm("Supprimer ce plat de la carte ?")) return;
  const res = await fetch(`/api/plats/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadPlatsMenu();
}

async function deleteCategorie(id) {
  if (!confirm("Supprimer cette catégorie ?")) return;
  const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadCategories();
  await loadPlatsMenu();
}

document.getElementById("form-categorie").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nom = e.target.nom.value.trim();
  const ordre_affichage = Number(e.target.ordre_affichage.value) || 0;
  const res = await fetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, ordre_affichage }),
  });
  const errorEl = document.getElementById("error-categorie");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  e.target.reset();
  await loadCategories();
});

document.getElementById("form-plat-menu").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    nom: form.nom.value.trim(),
    id_categorie: form.id_categorie.value || null,
    description: form.description.value.trim() || null,
    prix: form.prix.value || null,
    vegetarien: form.vegetarien.value,
    unite: form.unite.value,
    sur_commande: form.sur_commande.checked,
  };
  const res = await fetch("/api/plats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const errorEl = document.getElementById("error-plat-menu");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  form.reset();
  await loadPlatsMenu();
});

// --- Variantes ---

// Le nom du plat n'est plus passe en argument depuis l'attribut onclick : il y
// etait insere dans du JavaScript, contexte ou un echappement HTML ne protege
// pas. On le retrouve dans la liste deja chargee en memoire, et textContent
// l'affiche sans jamais l'interpreter.
// Le nom du plat n'est plus transporte par l'attribut onclick : ce qui est
// place la est interprete comme du JavaScript, et aucun echappement HTML ne
// protege ce contexte. On le relit depuis les plats deja charges en memoire.
async function ouvrirVariantes(idPlat) {
  variantePlatId = idPlat;
  const plat = platsMenu.find((p) => p.id === idPlat);
  document.getElementById("carte-variantes").hidden = false;
  // textContent, et non innerHTML : le navigateur traite la valeur comme du
  // texte, quel que soit son contenu.
  document.getElementById("variantes-plat-nom").textContent = plat ? plat.nom : "";
  await loadVariantes();
}

async function loadVariantes() {
  const res = await fetch(`/api/variantes?id_plat=${variantePlatId}`);
  const variantes = await res.json();
  document.querySelector("#table-variantes tbody").innerHTML = variantes
    .map(
      (v) => `<tr>
        <td>${echapperHtml(v.nom)}</td>
        <td>${v.prix} €</td>
        <td>${v.actif ? "Oui" : "Non"}</td>
        <td>
          <button class="small" onclick="toggleVariante(${v.id}, ${v.actif})">${v.actif ? "Désactiver" : "Activer"}</button>
          <button class="danger small" onclick="deleteVariante(${v.id})">Supprimer</button>
        </td>
      </tr>`
    )
    .join("");
}

document.getElementById("form-variante").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const res = await fetch("/api/variantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_plat: variantePlatId,
      nom: form.nom.value.trim(),
      prix: form.prix.value,
    }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  form.reset();
  await loadVariantes();
});

async function toggleVariante(id, actif) {
  await fetch(`/api/variantes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif: !actif }),
  });
  await loadVariantes();
}

async function deleteVariante(id) {
  if (!confirm("Supprimer cette variante ?")) return;
  await fetch(`/api/variantes/${id}`, { method: "DELETE" });
  await loadVariantes();
}

document.getElementById("btn-fermer-variantes").addEventListener("click", () => {
  variantePlatId = null;
  document.getElementById("carte-variantes").hidden = true;
});

(async () => {
  await loadCategories();
  await loadPlatsMenu();
})();
