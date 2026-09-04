// Échappe une valeur avant de l'insérer dans du HTML construit à la main.
//
// Nécessaire parce que plusieurs écrans du back-office affichent des textes
// saisis depuis les formulaires publics (nom et téléphone d'une réservation,
// commentaire d'une commande). Sans échappement, un visiteur peut y déposer
// du HTML qui s'exécutera plus tard dans le navigateur d'un membre du
// personnel, donc avec sa session : c'est une XSS stockée.
//
// nav.js est chargé avant les scripts de page sur tous les écrans internes,
// la fonction est donc disponible partout.
function echapperHtml(valeur) {
  if (valeur === null || valeur === undefined) return "";
  return String(valeur)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Navigation regroupée par domaine, filtrée selon le rôle connecté.
// Objectif : quelqu'un qui découvre l'appli doit pouvoir s'y retrouver
// rien qu'en lisant les intitulés de section (Vue d'ensemble, Stock
// surgelé, Restaurant, Administration).
const NAV_SECTIONS = [
  {
    label: "Vue d'ensemble",
    items: [
      { href: "index.html", label: "Dashboard", icon: "📊", roles: ["admin"] },
      { href: "statistiques.html", label: "Statistiques", icon: "📈", roles: ["admin"] },
    ],
  },
  {
    label: "Stock surgelé",
    items: [
      { href: "plats.html", label: "Plats & cuisines", icon: "🍲", roles: ["admin"] },
      { href: "stock.html", label: "Stock", icon: "📦", roles: ["admin"] },
      { href: "preparations.html", label: "Planning", icon: "📅", roles: ["admin"] },
      { href: "ventes.html", label: "Ventes", icon: "💰", roles: ["admin"] },
    ],
  },
  {
    label: "Restaurant",
    items: [
      { href: "menu.html", label: "Carte", icon: "📋", roles: ["admin"] },
      { href: "cuisine.html", label: "Cuisine", icon: "👨‍🍳", roles: ["admin", "cuisine"] },
      { href: "salle.html", label: "Salle", icon: "🧑‍🍳", roles: ["admin", "salle"] },
      { href: "reservations-admin.html", label: "Réservations", icon: "📆", roles: ["admin", "salle"] },
      { href: "ventes-restaurant.html", label: "Ventes restaurant", icon: "🧾", roles: ["admin"] },
    ],
  },
  {
    label: "Administration",
    items: [{ href: "users.html", label: "Comptes", icon: "👥", roles: ["admin"] }],
  },
];

const LABEL_ROLE = { admin: "Administrateur", cuisine: "Cuisine", salle: "Salle" };

function renderSidebar(active, role) {
  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";

  const sectionsHtml = NAV_SECTIONS.map((section) => {
    const items = section.items.filter((item) => item.roles.includes(role));
    if (items.length === 0) return "";
    return `<div class="sidebar-section">
      <div class="sidebar-section-label">${section.label}</div>
      ${items
        .map(
          (item) =>
            `<a href="${item.href}" class="${item.href === active ? "active" : ""}">
              <span class="icon">${item.icon}</span>${item.label}
            </a>`
        )
        .join("")}
    </div>`;
  }).join("");

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-title">Mirasia</span>
      <span class="sidebar-brand-subtitle">Gestion · Verviers</span>
    </div>
    <nav class="sidebar-nav">${sectionsHtml}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user" id="sidebar-username"></div>
      <div class="sidebar-role" id="sidebar-role"></div>
      <button type="button" class="logout" id="logout-link">Déconnexion</button>
    </div>
  `;
  return sidebar;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  const topbar = document.querySelector("header.topbar");
  if (!topbar) return;
  const auth = await window.mirasiaAuthReady;
  if (!auth.authenticated) return; // guard.js redirige déjà vers login.html

  const sidebar = renderSidebar(document.body.dataset.page, auth.role);
  document.body.prepend(sidebar);
  document.body.classList.add("with-sidebar");

  document.getElementById("sidebar-username").textContent = auth.username;
  document.getElementById("sidebar-role").textContent = LABEL_ROLE[auth.role] || auth.role;
  document.getElementById("logout-link").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
});
