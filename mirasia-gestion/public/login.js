document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: form.username.value,
      password: form.password.value,
    }),
  });
  const errorEl = document.getElementById("error-login");
  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.message;
    errorEl.hidden = false;
    return;
  }
  const landing = { cuisine: "cuisine.html", salle: "salle.html" }[data.role] || "index.html";
  window.location.href = landing;
});
