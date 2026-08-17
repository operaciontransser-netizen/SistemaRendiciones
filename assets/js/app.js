document.addEventListener("DOMContentLoaded", async () => {
  console.log("Sistema de Rendiciones iniciado");

  const rendiciones = await obtenerDatosGoogleSheets();

  console.log("Rendiciones reales:");
  console.log(rendiciones);
});