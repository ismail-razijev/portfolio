let users = [];
let currentUserId = null;

const LABEL_ROLE = { admin: "Admin", cuisine: "Cuisine", salle: "Salle" };

function renderUserRow(u) {
  const isSelf = u.id === currentUserId;
  return `<tr>
    <td>${u.username}</td>
    <td>${u.nom_complet || "-"}</td>
    <td>${LABEL_ROLE[u.role] || u.role}</td>
    <td>${u.actif ? "Oui" : "Non"}</td>
    <td>
      <button class="small" onclick="resetPassword(${u.id})">Changer le mot de passe</button>
      <button class="small" ${isSelf ? "disabled" : ""} onclick="toggleUser(${u.id}, ${u.actif})">${u.actif ? "Désactiver" : "Activer"}</button>
      <button class="danger small" ${isSelf ? "disabled" : ""} onclick="deleteUser(${u.id})">Supprimer</button>
    </td>
  </tr>`;
}

async function loadUsers() {
  const res = await fetch("/api/users");
  users = await res.json();
  const body = document.querySelector("#table-users tbody");
  body.innerHTML = users.map(renderUserRow).join("");
  document.getElementById("empty-users").hidden = users.length > 0;
}

document.getElementById("form-user").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    username: form.username.value.trim(),
    nom_complet: form.nom_complet.value.trim() || null,
    role: form.role.value,
    password: form.password.value,
  };
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const errorEl = document.getElementById("error-user");
  if (!res.ok) {
    const data = await res.json();
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  form.reset();
  await loadUsers();
});

async function toggleUser(id, actif) {
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actif: !actif }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadUsers();
}

async function resetPassword(id) {
  const password = prompt("Nouveau mot de passe pour ce compte :");
  if (!password) return;
  const res = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  alert("Mot de passe mis à jour.");
}

async function deleteUser(id) {
  if (!confirm("Supprimer ce compte ?")) return;
  const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    alert(data.message);
    return;
  }
  await loadUsers();
}

(async () => {
  const auth = await window.mirasiaAuthReady;
  currentUserId = auth.id;
  await loadUsers();
})();
