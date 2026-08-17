const GOOGLE_SHEETS_API =
  "https://script.google.com/macros/s/AKfycbxakaKu-ysq3IvTl30y0JNJsoYk93h2J2hu-9WfumprQnP_Z6XU_eBwhz3E4YD7TUgEvA/exec";


// ======================================================
// OBTENER USUARIO ACTUAL DESDE LA SESIÓN
// ======================================================

function obtenerUsuarioActual() {
  const usuarioGuardado =
    localStorage.getItem("usuarioActual");

  if (!usuarioGuardado) {
    return null;
  }

  try {
    const usuario =
      JSON.parse(usuarioGuardado);

    if (
      !usuario ||
      !usuario.email
    ) {
      return null;
    }

    return usuario;

  } catch (error) {
    console.error(
      "Error leyendo usuarioActual:",
      error
    );

    return null;
  }
}


// ======================================================
// REALIZAR SOLICITUD AL APPS SCRIPT
// ======================================================

async function solicitarAppsScript(
  parametrosAdicionales = {}
) {
  const usuario =
    obtenerUsuarioActual();

  if (!usuario) {
    throw new Error(
      "No existe un usuario autenticado."
    );
  }

  const parametros =
    new URLSearchParams();

  parametros.set(
    "usuario",
    usuario.email
  );

  Object.entries(
    parametrosAdicionales
  ).forEach(([clave, valor]) => {
    if (
      valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== ""
    ) {
      parametros.set(
        clave,
        String(valor)
      );
    }
  });

  const url =
    `${GOOGLE_SHEETS_API}?${parametros.toString()}`;

  console.log(
    "Consultando Apps Script:",
    url
  );

  const respuesta =
    await fetch(
      url,
      {
        method: "GET",
        cache: "no-store"
      }
    );

  if (!respuesta.ok) {
    throw new Error(
      `Error HTTP: ${respuesta.status}`
    );
  }

  const datos =
    await respuesta.json();

  console.log(
    "Respuesta Apps Script:",
    datos
  );

  if (
    datos &&
    datos.error
  ) {
    throw new Error(
      datos.error
    );
  }

  return datos;
}


// ======================================================
// OBTENER LISTADO O DETALLE DE RENDICIONES
// ======================================================

async function obtenerDatosGoogleSheets(
  id = ""
) {
  try {
    const parametros = {};

    if (id) {
      parametros.id = id;
    }

    return await solicitarAppsScript(
      parametros
    );

  } catch (error) {
    console.error(
      "Error leyendo Google Sheets:",
      error
    );

    return id
      ? null
      : [];
  }
}


// ======================================================
// AUTORIZAR RENDICIÓN
// SOLO EL ROL INTERNO ADMIN PUEDE EJECUTARLA
// ======================================================

async function autorizarRendicionGoogleSheets(
  id
) {
  if (!id) {
    throw new Error(
      "No se indicó el folio de la rendición."
    );
  }

  const usuario =
    obtenerUsuarioActual();

  if (!usuario) {
    throw new Error(
      "No existe un usuario autenticado."
    );
  }

  const rol =
    String(
      usuario.rol || ""
    )
      .trim()
      .toUpperCase();

  if (rol !== "ADMIN") {
    throw new Error(
      "Solo el Jefe de Área puede autorizar rendiciones."
    );
  }

  return await solicitarAppsScript({
    accion: "autorizar_rendicion",
    id: id
  });
}