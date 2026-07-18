const PROCHAIN_STATUT = {
  recu: "en_preparation",
  en_preparation: "pret",
  pret: "servi",
};

const LABEL_STATUT = {
  recu: "Reçue",
  en_preparation: "En préparation",
  pret: "Prête",
  servi: "Servie",
};

const LABEL_ACTION = {
  recu: "Démarrer la préparation",
  en_preparation: "Marquer prête",
  pret: "Marquer servie",
};

function tempsEcoule(dateCommande) {
  const minutes = Math.floor((Date.now() - new Date(dateCommande).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  return `il y a ${minutes} min`;
}

function ligneTexte(l) {
  return `${l.quantite} × ${l.plat_nom}${l.variante_nom ? " (" + l.variante_nom + ")" : ""}${l.option_vegetarien ? " 🌱" : ""}${l.commentaire ? " - " + l.commentaire : ""}`;
}

function commandeCarte(c, titre) {
  const action = PROCHAIN_STATUT[c.statut];
  return `<div class="commande-carte statut-${c.statut}">
    <h3>${titre}</h3>
    <div class="heure">Commande ${tempsEcoule(c.date_commande)}</div>
    <span class="badge ${c.statut}">${LABEL_STATUT[c.statut]}</span>
    <ul>${c.lignes.map((l) => `<li>${ligneTexte(l)}</li>`).join("")}</ul>
    ${action ? `<button type="button" onclick="avancerStatut(${c.id}, '${action}')">${LABEL_ACTION[c.statut]}</button>` : ""}
  </div>`;
}

async function avancerStatut(id, statut) {
  await fetch(`/api/commandes-client/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
  await charger();
}

async function charger() {
  const res = await fetch("/api/commandes-client?statut=recu,en_preparation,pret");
  const commandes = await res.json();

  const surPlace = commandes.filter((c) => c.mode === "sur_place");
  const emporter = commandes.filter((c) => c.mode === "a_emporter");

  document.getElementById("commandes-sur-place").innerHTML = surPlace
    .map((c) => commandeCarte(c, "Table " + (c.table_numero || "?")))
    .join("");
  document.getElementById("empty-sur-place").hidden = surPlace.length > 0;

  document.getElementById("commandes-emporter").innerHTML = emporter
    .map((c) => commandeCarte(c, "Commande #" + c.id))
    .join("");
  document.getElementById("empty-emporter").hidden = emporter.length > 0;
}

charger();
setInterval(charger, 8000);
