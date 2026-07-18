function renderNav(active) {
  const pages = [
    { href: "index.html", label: "Dashboard" },
    { href: "plats.html", label: "Plats & cuisines" },
    { href: "stock.html", label: "Stock" },
    { href: "preparations.html", label: "Planning" },
    { href: "ventes.html", label: "Ventes" },
    { href: "statistiques.html", label: "Statistiques" },
    { href: "menu.html", label: "Carte" },
    { href: "cuisine.html", label: "Cuisine" },
    { href: "salle.html", label: "Salle" },
    { href: "reservations-admin.html", label: "Réservations" },
    { href: "ventes-restaurant.html", label: "Ventes restaurant" },
  ];
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

document.addEventListener("DOMContentLoaded", () => {
  const topbar = document.querySelector("header.topbar");
  if (topbar) {
    topbar.appendChild(renderNav(document.body.dataset.page));
    document.getElementById("logout-link").addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
});
