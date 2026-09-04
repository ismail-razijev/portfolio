let tablesDisponibles = [];

async function loadTables() {
  const res = await fetch("/api/tables");
  tablesDisponibles = await res.json();
}

function tableOptions(selectedId) {
  return (
    `<option value="">-- non assignée --</option>` +
    tablesDisponibles
      .map((t) => `<option value="${t.id}" ${t.id === selectedId ? "selected" : ""}>Table ${t.numero}</option>`)
      .join("")
  );
}

async function loadReservations() {
  const res = await fetch("/api/reservations");
  const reservations = await res.json();
  document.getElementById("empty-reservations").hidden = reservations.length > 0;
  document.querySelector("#table-reservations tbody").innerHTML = reservations
    .map(
      (r) => `<tr>
        <td>${new Date(r.date_reservation).toLocaleDateString("fr-BE")}</td>
        <td>${r.heure_reservation.slice(0, 5)}</td>
        <td>${echapperHtml(r.nom_client)}</td>
        <td>${echapperHtml(r.telephone_client)}</td>
        <td>${r.nb_personnes}</td>
        <td><select onchange="assignerTable(${r.id}, this.value)">${tableOptions(r.id_table)}</select></td>
        <td><span class="badge ${echapperHtml(r.statut)}">${echapperHtml(r.statut)}</span></td>
        <td>
          <button class="small" onclick="changerStatut(${r.id}, 'confirmee')">Confirmer</button>
          <button class="danger small" onclick="changerStatut(${r.id}, 'annulee')">Annuler</button>
        </td>
      </tr>`
    )
    .join("");
}

async function changerStatut(id, statut) {
  await fetch(`/api/reservations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ statut }),
  });
  await loadReservations();
}

async function assignerTable(id, idTable) {
  await fetch(`/api/reservations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_table: idTable || null }),
  });
  await loadReservations();
}

(async () => {
  await loadTables();
  await loadReservations();
})();
