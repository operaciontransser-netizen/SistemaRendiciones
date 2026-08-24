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
// ROL Y EMPRESA SELECCIONADA
// ======================================================

function normalizarRolUsuario(rol) {
  return String(rol || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}


function esUsuarioSuperAdmin(usuario) {
  return normalizarRolUsuario(
    usuario && usuario.rol
  ) === "SUPER ADMIN";
}


function obtenerEmpresaSeleccionada() {
  const usuario =
    obtenerUsuarioActual();

  if (!esUsuarioSuperAdmin(usuario)) {
    return "";
  }

  return String(
    localStorage.getItem(
      "empresaSeleccionada"
    ) || ""
  ).trim();
}


function guardarEmpresaSeleccionada(
  codigoEmpresa = ""
) {
  const usuario =
    obtenerUsuarioActual();

  if (!esUsuarioSuperAdmin(usuario)) {
    localStorage.removeItem(
      "empresaSeleccionada"
    );

    return "";
  }

  const empresa = String(
    codigoEmpresa || ""
  ).trim();

  localStorage.setItem(
    "empresaSeleccionada",
    empresa
  );

  return empresa;
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

  // El filtro global solo se envía para SUPER ADMIN.
  // Si una función indicó empresa explícitamente,
  // ese valor tiene prioridad.
  if (
    esUsuarioSuperAdmin(usuario) &&
    !parametros.has("empresa")
  ) {
    const empresaSeleccionada =
      obtenerEmpresaSeleccionada();

    if (empresaSeleccionada) {
      parametros.set(
        "empresa",
        empresaSeleccionada
      );
    }
  }

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
// OBTENER EMPRESAS DISPONIBLES
// ======================================================

async function obtenerEmpresasGoogleSheets() {
  const usuario =
    obtenerUsuarioActual();

  if (!usuario) {
    return [];
  }

  try {
    const empresas =
      await solicitarAppsScript({
        empresas: "1"
      });

    return Array.isArray(empresas)
      ? empresas
      : [];

  } catch (error) {
    console.error(
      "Error cargando empresas:",
      error
    );

    return [];
  }
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
// ADMIN Y SUPER ADMIN PUEDEN SOLICITAR LA ACCIÓN.
// EL APPS SCRIPT VALIDA EMPRESA Y RUT ASIGNADO.
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
    normalizarRolUsuario(
      usuario.rol
    );

  if (
    rol !== "ADMIN" &&
    rol !== "SUPER ADMIN"
  ) {
    throw new Error(
      "Solo el Jefe de Área o Super Administrador puede autorizar rendiciones."
    );
  }

  return await solicitarAppsScript({
    accion: "autorizar_rendicion",
    id: id
  });
}


// ======================================================
// FONDOS Y ABONOS
// ======================================================

async function obtenerAbonosGoogleSheets(
  filtros = {}
) {
  return await solicitarAppsScript({
    accion: "listar_abonos",
    rut: filtros.rut || "",
    estado: filtros.estado || ""
  });
}


async function registrarAbonoGoogleSheets(
  datos = {}
) {
  const usuario = obtenerUsuarioActual();
  const rol = normalizarRolUsuario(
    usuario && usuario.rol
  );

  if (
    rol !== "ADMIN" &&
    rol !== "SUPER ADMIN"
  ) {
    throw new Error(
      "Solo el Jefe de Área o Super Administrador puede registrar abonos."
    );
  }

  return await solicitarAppsScript({
    accion: "registrar_abono",
    rut: datos.rut || "",
    fecha: datos.fecha || "",
    monto: datos.monto || "",
    medio_pago: datos.medio_pago || "",
    referencia: datos.referencia || "",
    observacion: datos.observacion || "",
    comprobante_url: datos.comprobante_url || ""
  });
}


async function anularAbonoGoogleSheets(
  idAbono,
  motivo
) {
  const usuario = obtenerUsuarioActual();
  const rol = normalizarRolUsuario(
    usuario && usuario.rol
  );

  if (
    rol !== "ADMIN" &&
    rol !== "SUPER ADMIN"
  ) {
    throw new Error(
      "Solo el Jefe de Área o Super Administrador puede anular abonos."
    );
  }

  return await solicitarAppsScript({
    accion: "anular_abono",
    id_abono: idAbono || "",
    motivo: motivo || ""
  });
}


async function obtenerCartolaGoogleSheets(
  rut
) {
  if (!rut) {
    throw new Error(
      "Debe seleccionar un colaborador."
    );
  }

  return await solicitarAppsScript({
    accion: "obtener_cartola",
    rut: rut
  });
}
