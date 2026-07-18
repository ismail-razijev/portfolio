document.getElementById("form-reservation").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    nom_client: form.nom_client.value.trim(),
    telephone_client: form.telephone_client.value.trim(),
    date_reservation: form.date_reservation.value,
    heure_reservation: form.heure_reservation.value,
    nb_personnes: Number(form.nb_personnes.value),
    commentaire: form.commentaire.value.trim() || null,
  };
  const res = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  const errorEl = document.getElementById("error-reservation");
  if (!res.ok) {
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  document.getElementById("vue-formulaire").hidden = true;
  document.getElementById("vue-confirmation").hidden = false;
});
