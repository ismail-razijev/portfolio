(async () => {
  const res = await fetch("/api/me");
  const data = await res.json();
  if (!data.authenticated) {
    window.location.href = "login.html";
  }
})();
