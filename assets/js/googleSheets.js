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

  let datos;

  try {
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

    datos =
      await respuesta.json();

  } catch (error) {
    // Algunos despliegues de Apps Script responden mediante una redirección
    // que el navegador bloquea por CORS cuando el frontend se ejecuta
    // desde localhost/127.0.0.1. En ese caso usamos JSONP como transporte
    // de compatibilidad, sin cambiar los parámetros ni la lógica del backend.
    const esErrorRed =
      error instanceof TypeError ||
      /failed to fetch|networkerror|load failed/i.test(
        String(error && error.message || error || "")
      );

    if (!esErrorRed) {
      throw error;
    }

    console.warn(
      "Fetch bloqueado o no disponible; reintentando Apps Script mediante JSONP.",
      error
    );

    datos = await solicitarAppsScriptJSONP(url);
  }

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
// TRANSPORTE JSONP DE COMPATIBILIDAD PARA APPS SCRIPT
// ======================================================

function solicitarAppsScriptJSONP(
  url,
  timeoutMs = 30000
) {
  return new Promise((resolve, reject) => {
    const callbackName =
      `__srJsonp_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

    const script =
      document.createElement("script");

    let finalizado = false;

    const limpiar = () => {
      if (finalizado) {
        return;
      }

      finalizado = true;
      clearTimeout(temporizador);
      script.remove();

      try {
        delete window[callbackName];
      } catch (error) {
        window[callbackName] = undefined;
      }
    };

    window[callbackName] = (datos) => {
      limpiar();
      resolve(datos);
    };

    script.onerror = () => {
      limpiar();
      reject(
        new Error(
          "No fue posible cargar la respuesta de Apps Script mediante JSONP."
        )
      );
    };

    const separador =
      url.includes("?") ? "&" : "?";

    script.src =
      `${url}${separador}callback=${encodeURIComponent(callbackName)}` +
      `&_jsonp=${Date.now()}`;

    script.async = true;

    const temporizador = setTimeout(() => {
      limpiar();
      reject(
        new Error(
          "Tiempo de espera agotado consultando Apps Script."
        )
      );
    }, timeoutMs);

    document.head.appendChild(script);
  });
}


// ======================================================
// CACHE LOCAL DE CONSULTAS DE LECTURA
// ======================================================
// Solo se usa para mejorar la percepción de velocidad al volver a entrar
// a un módulo. El Apps Script sigue siendo la fuente de verdad y las
// operaciones de escritura no utilizan esta función.
async function solicitarAppsScriptConCache(
  parametrosAdicionales = {},
  clave = "consulta",
  maxEdadMs = 15000
) {
  const usuario = obtenerUsuarioActual();
  if (!usuario) {
    throw new Error("No existe un usuario autenticado.");
  }

  const empresa = obtenerEmpresaSeleccionada();
  const identidad = [
    usuario.email,
    normalizarRolUsuario(usuario.rol),
    empresa,
    clave,
    JSON.stringify(parametrosAdicionales || {})
  ].join("|");

  let cacheKey = "SR_CACHE_";
  try {
    const bytes = new TextEncoder().encode(identidad);
    let binario = "";
    bytes.forEach((b) => { binario += String.fromCharCode(b); });
    cacheKey += btoa(binario).replace(/[^a-zA-Z0-9]/g, "").slice(0, 120);
  } catch (error) {
    cacheKey += encodeURIComponent(identidad).slice(0, 120);
  }

  let cacheLocal = null;
  try {
    cacheLocal = JSON.parse(
      sessionStorage.getItem(cacheKey) || "null"
    );
  } catch (error) {
    cacheLocal = null;
  }

  const edad = cacheLocal && Number(cacheLocal.enviadoEn)
    ? Date.now() - Number(cacheLocal.enviadoEn)
    : Number.POSITIVE_INFINITY;

  if (cacheLocal && edad >= 0 && edad <= maxEdadMs) {
    // Refresca en segundo plano para no bloquear la navegación.
    solicitarAppsScript(parametrosAdicionales)
      .then((datos) => {
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ enviadoEn: Date.now(), datos })
          );
        } catch (error) {}
      })
      .catch(() => {});

    return cacheLocal.datos;
  }

  const datos = await solicitarAppsScript(parametrosAdicionales);

  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ enviadoEn: Date.now(), datos })
    );
  } catch (error) {}

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
