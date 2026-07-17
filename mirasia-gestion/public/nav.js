function renderNav(active) {
  const pages = [
    { href: "index.html", label: "Dashboard" },
    { href: "plats.html", label: "Plats & cuisines" },
    { href: "stock.html", label: "Stock" },
    { href: "preparations.html", label: "Planning" },
  ];
  const nav = document.createElement("nav");
  nav.innerHTML = pages
    .map(
      (p) =>
        `<a href="${p.href}" class="${p.href === active ? "active" : ""}">${p.label}</a>`
    )
    .join("");
  return nav;
}

document.addEventListener("DOMContentLoaded", () => {
  const topbar = document.querySelector("header.topbar");
  if (topbar) {
    topbar.appendChild(renderNav(document.body.dataset.page));
  }
});
