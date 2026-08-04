function renderNav(active, role) {
  const allPages = [
    { href: "index.html", label: "Dashboard", roles: ["admin"] },
    { href: "plats.html", label: "Plats & cuisines", roles: ["admin"] },
    { href: "stock.html", label: "Stock", roles: ["admin"] },
    { href: "preparations.html", label: "Planning", roles: ["admin"] },
    { href: "ventes.html", label: "Ventes", roles: ["admin"] },
    { href: "statistiques.html", label: "Statistiques", roles: ["admin"] },
    { href: "menu.html", label: "Carte", roles: ["admin"] },
    { href: "cuisine.html", label: "Cuisine", roles: ["admin", "cuisine"] },
    { href: "salle.html", label: "Salle", roles: ["admin", "salle"] },
    { href: "reservations-admin.html", label: "Réservations", roles: ["admin", "salle"] },
    { href: "ventes-restaurant.html", label: "Ventes restaurant", roles: ["admin"] },
    { href: "users.html", label: "Comptes", roles: ["admin"] },
  ];
  const pages = allPages.filter((p) => p.roles.includes(role));
  const nav = document.createElement("nav");
  nav.innerHTML =
    pages
      .map(
        (p) =>
          `<a href="${p.href}" class="${p.href === active ? "active" : ""}">${p.label}</a>`
      )
      .join("") + `<a href="#" id="logout-link">Déconnexion</a>`;
  return nav;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  const topbar = document.querySelector("header.topbar");
  if (topbar) {
    const auth = await window.mirasiaAuthReady;
    if (!auth.authenticated) return; // guard.js redirige déjà vers login.html
    topbar.appendChild(renderNav(document.body.dataset.page, auth.role));
    document.getElementById("logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
});
