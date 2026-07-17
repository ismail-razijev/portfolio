// Traduit les codes d'erreur PostgreSQL en réponses HTTP compréhensibles.
// Référence des codes : https://www.postgresql.org/docs/current/errcodes-appendix.html
function handleDbError(err, res) {
  if (err.code === "23503") {
    return res.status(409).json({
      message:
        "Impossible : cet élément est encore utilisé ailleurs (ex: un plat lié à du stock, une cuisine liée à un plat).",
    });
  }
  if (err.code === "23505") {
    return res.status(409).json({ message: "Cette valeur existe déjà." });
  }
  if (err.code === "23514") {
    return res.status(400).json({
      message: "Valeur invalide (ex: quantité, prix ou seuil négatif).",
    });
  }
  console.error(err);
  return res.status(500).json({ message: "Erreur serveur." });
}

module.exports = { handleDbError };
