// Échappement HTML, chargé sur toutes les pages avant les autres scripts.
//
// Plusieurs écrans construisent leur balisage à la main avec des littéraux de
// gabarit puis l'injectent via innerHTML. Toute valeur venant de la base doit
// donc être neutralisée avant insertion, sans quoi un texte contenant du HTML
// s'exécute dans le navigateur de celui qui l'affiche. Le cas le plus direct
// vient des formulaires publics (nom d'une réservation, commentaire d'une
// commande), qui atterrissent dans le back-office.
//
// Neutralise les cinq caractères qui permettent de créer une balise ou de
// sortir d'un attribut. À utiliser pour du contenu HTML ou une valeur
// d'attribut, jamais pour composer du JavaScript.
function echapperHtml(valeur) {
  if (valeur === null || valeur === undefined) return "";
  return String(valeur)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
