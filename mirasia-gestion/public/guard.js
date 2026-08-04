function landingPageFor(role) {
  if (role === "cuisine") return "cuisine.html";
  if (role === "salle") return "salle.html";
  return "index.html";
}

// Promesse partagée avec nav.js : les deux scripts ont besoin du même appel
// à /api/me (authentifié ? quel rôle ?), sans le dupliquer.
window.mirasiaAuthReady = (async () => {
  const res = await fetch("/api/me");
  const data = await res.json();

  if (!data.authenticated) {
    window.location.href = "login.html";
    return data;
  }

  const allowedRoles = (document.body.dataset.roles || "admin,cuisine,salle").split(",");
  if (!allowedRoles.includes(data.role)) {
    window.location.href = landingPageFor(data.role);
    return data;
  }

  return data;
})();
