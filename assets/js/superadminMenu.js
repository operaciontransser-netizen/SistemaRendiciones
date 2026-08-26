document.addEventListener("DOMContentLoaded", function () {
  let usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem("usuarioActual") || "null");
  } catch (_) {
    usuario = null;
  }

  const rol = String(usuario && usuario.rol || "")
    .trim().toUpperCase().replace(/_/g, " ").replace(/\\s+/g, " ");
  const autorizado = rol === "SUPER ADMIN";

  document.querySelectorAll("[data-superadmin-only]").forEach(function (elemento) {
    elemento.style.display = autorizado ? "" : "none";
  });
});
