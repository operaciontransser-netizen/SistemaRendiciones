document.addEventListener("DOMContentLoaded", async () => {
  console.log("detalleRendicion.js V7.1 frontend iniciado");

  const id = new URLSearchParams(window.location.search).get("id");
  const tabla = document.getElementById("tablaDocumentos");
  const folio = document.getElementById("detalleFolio");
  const colaborador = document.getElementById("detalleColaborador");
  const viaje = document.getElementById("detalleViaje");
  const total = document.getElementById("totalRendicion");

  if (!tabla || !folio || !colaborador || !viaje || !total) {
    console.error("No se encontraron los elementos del detalle.");
    return;
  }

  prepararInterfazRevision(tabla);

  if (!id) {
    mostrarErrorTabla(tabla, "No se indicó un ID de rendición.");
    return;
  }

  tabla.innerHTML = `
    <tr>
      <td colspan="8" class="text-center text-muted">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        Cargando documentos...
      </td>
    </tr>
  `;

  const detalle = await obtenerDatosGoogleSheets(id);
  console.log("Detalle recibido:", detalle);

  if (!detalle || !Array.isArray(detalle.documentos)) {
    mostrarErrorTabla(tabla, "No fue posible cargar la rendición.");
    return;
  }

  window.detalleRendicionActual = detalle;
  window.revisionesComprobantes = {};

  folio.textContent = detalle.ID || "-";
  colaborador.textContent = detalle.colaborador || "-";
  viaje.textContent = detalle.numero_viaje || "-";

  actualizarEstadoRendicion(detalle);
  renderizarAutorizacion(detalle);
  renderizarDocumentos(detalle, tabla);
  actualizarResumenRevision(detalle);
});


// ======================================================
// PREPARAR INTERFAZ SIN EXIGIR CAMBIOS EN EL HTML
// ======================================================

function prepararInterfazRevision(tabla) {
  const encabezado = tabla.closest("table")?.querySelector("thead tr");

  if (encabezado && !encabezado.querySelector("[data-columna-revision]")) {
    const th = document.createElement("th");
    th.className = "text-center";
    th.dataset.columnaRevision = "true";
    th.textContent = "Revisión";
    encabezado.appendChild(th);
  }

  if (document.getElementById("resumenRevisionComprobantes")) {
    return;
  }

  const bloque = document.createElement("div");
  bloque.id = "resumenRevisionComprobantes";
  bloque.className = "card mb-4 d-none";
  bloque.innerHTML = `
    <div class="card-header">
      <strong><i class="bi bi-clipboard-check me-2"></i>Revisión de comprobantes</strong>
    </div>
    <div class="card-body">
      <p id="textoRevisionComprobantes" class="text-muted mb-3"></p>

      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <small class="text-muted">Presentado</small>
          <div id="totalPresentadoRevision" class="fw-bold fs-5">$0</div>
        </div>
        <div class="col-6 col-lg-3">
          <small class="text-muted">Autorizado</small>
          <div id="totalAutorizadoRevision" class="fw-bold fs-5 text-success">$0</div>
        </div>
        <div class="col-6 col-lg-3">
          <small class="text-muted">Rechazado</small>
          <div id="totalRechazadoRevision" class="fw-bold fs-5 text-danger">$0</div>
        </div>
        <div class="col-6 col-lg-3">
          <small class="text-muted">Pendiente</small>
          <div id="totalPendienteRevision" class="fw-bold fs-5 text-warning">$0</div>
        </div>
      </div>

      <button
        type="button"
        id="btnFinalizarRevision"
        class="btn btn-primary d-none"
      >
        <i class="bi bi-check2-square me-1"></i>
        Finalizar revisión
      </button>

      <div id="mensajeRevision" class="d-none" role="alert"></div>
    </div>
  `;

  const cardDocumentos = tabla.closest(".card");
  if (cardDocumentos) {
    cardDocumentos.insertAdjacentElement("afterend", bloque);
  }

  document
    .getElementById("btnFinalizarRevision")
    ?.addEventListener("click", finalizarRevisionComprobantes);
}


// ======================================================
// RENDERIZAR DOCUMENTOS
// ======================================================

function renderizarDocumentos(detalle, tabla) {
  const puedeRevisar = Boolean(detalle.puede_revisar);
  const estadoRendicion = normalizarEstado(detalle.estado_rendicion);
  const revisionAbierta = puedeRevisar && estadoRendicion === "PENDIENTE";

  if (!detalle.documentos.length) {
    tabla.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          La rendición no tiene documentos.
        </td>
      </tr>
    `;
    document.getElementById("totalRendicion").textContent = formatearDinero(0);
    return;
  }

  let totalPresentado = 0;

  tabla.innerHTML = detalle.documentos
    .map((doc, indice) => {
      const monto = convertirMonto(doc.monto_total);
      totalPresentado += monto;

      const idComprobante = String(doc.id_comprobante || "").trim();
      const estado = normalizarEstado(doc.estado_comprobante || "PENDIENTE");
      const motivo = String(doc.revision_motivo || "").trim();
      const urlComprobante =
        doc.fotografia || doc.FOTOGRAFIA || doc.archivo_url || "";

      if (idComprobante) {
        window.revisionesComprobantes[idComprobante] = {
          id_comprobante: idComprobante,
          estado_comprobante: estado,
          revision_motivo: motivo,
          monto
        };
      }

      return `
        <tr data-id-comprobante="${escaparAtributo(idComprobante)}">
          <td>${escaparHTML(doc.fecha_documento || "-")}</td>
          <td>${escaparHTML(doc.numero_documento || "-")}</td>
          <td>${escaparHTML(doc.proveedor || "-")}</td>
          <td>${escaparHTML(doc.tipo_documento || "-")}</td>
          <td>${escaparHTML(doc.descripcion || "-")}</td>
          <td class="text-end">${formatearDinero(monto)}</td>
          <td class="text-center">
            ${urlComprobante
              ? `<a href="${escaparAtributo(urlComprobante)}" target="_blank"
                    rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">
                   <i class="bi bi-eye"></i> Ver
                 </a>`
              : `<span class="text-muted">Sin respaldo</span>`}
          </td>
          <td class="text-center" style="min-width: 230px;">
            ${crearControlRevision(doc, indice, revisionAbierta)}
          </td>
        </tr>
      `;
    })
    .join("");

  document.getElementById("totalRendicion").textContent =
    formatearDinero(totalPresentado);

  if (revisionAbierta) {
    instalarEventosRevision(tabla, detalle);
  }
}


function crearControlRevision(doc, indice, revisionAbierta) {
  const idComprobante = String(doc.id_comprobante || "").trim();
  const estado = normalizarEstado(doc.estado_comprobante || "PENDIENTE");
  const motivo = String(doc.revision_motivo || "").trim();

  if (!idComprobante) {
    return `<span class="badge bg-secondary">Sin identificador</span>`;
  }

  if (!revisionAbierta) {
    if (estado === "AUTORIZADO") {
      return `
        <span class="badge bg-success">Autorizado</span>
        ${crearDatosRevision(doc)}
      `;
    }

    if (estado === "RECHAZADO") {
      return `
        <span class="badge bg-danger">Rechazado</span>
        <div class="small text-danger mt-1">${escaparHTML(motivo || "Sin motivo registrado")}</div>
        ${crearDatosRevision(doc)}
      `;
    }

    return `<span class="badge bg-warning text-dark">Pendiente</span>`;
  }

  const nombreRadio = `revision_${indice}`;

  return `
    <div class="d-flex justify-content-center gap-3 flex-wrap">
      <div class="form-check">
        <input
          class="form-check-input control-revision"
          type="radio"
          name="${nombreRadio}"
          id="autorizar_${indice}"
          value="AUTORIZADO"
          data-id-comprobante="${escaparAtributo(idComprobante)}"
          ${estado === "AUTORIZADO" ? "checked" : ""}
        >
        <label class="form-check-label text-success" for="autorizar_${indice}">
          Autorizar
        </label>
      </div>

      <div class="form-check">
        <input
          class="form-check-input control-revision"
          type="radio"
          name="${nombreRadio}"
          id="rechazar_${indice}"
          value="RECHAZADO"
          data-id-comprobante="${escaparAtributo(idComprobante)}"
          ${estado === "RECHAZADO" ? "checked" : ""}
        >
        <label class="form-check-label text-danger" for="rechazar_${indice}">
          Rechazar
        </label>
      </div>
    </div>

    <div class="mt-2 ${estado === "RECHAZADO" ? "" : "d-none"} contenedor-motivo">
      <textarea
        class="form-control form-control-sm motivo-rechazo"
        rows="2"
        maxlength="500"
        data-id-comprobante="${escaparAtributo(idComprobante)}"
        placeholder="Motivo obligatorio del rechazo"
      >${escaparHTML(motivo)}</textarea>
      <div class="invalid-feedback">Debe indicar el motivo del rechazo.</div>
    </div>
  `;
}


function crearDatosRevision(doc) {
  const nombre = doc.revisado_nombre || doc.revisado_por || "";
  const fecha = doc.revisado_en ? formatearFechaHora(doc.revisado_en) : "";

  if (!nombre && !fecha) {
    return "";
  }

  return `
    <div class="small text-muted mt-1">
      ${nombre ? escaparHTML(nombre) : ""}
      ${nombre && fecha ? " · " : ""}
      ${fecha ? escaparHTML(fecha) : ""}
    </div>
  `;
}


// ======================================================
// EVENTOS Y RESUMEN DE REVISIÓN
// ======================================================

function instalarEventosRevision(tabla, detalle) {
  tabla.querySelectorAll(".control-revision").forEach((control) => {
    control.addEventListener("change", () => {
      const idComprobante = control.dataset.idComprobante;
      const fila = control.closest("tr");
      const contenedorMotivo = fila?.querySelector(".contenedor-motivo");
      const motivo = fila?.querySelector(".motivo-rechazo");

      if (!window.revisionesComprobantes[idComprobante]) {
        return;
      }

      window.revisionesComprobantes[idComprobante].estado_comprobante = control.value;

      if (control.value === "RECHAZADO") {
        contenedorMotivo?.classList.remove("d-none");
        motivo?.focus();
      } else {
        contenedorMotivo?.classList.add("d-none");
        motivo?.classList.remove("is-invalid");
        window.revisionesComprobantes[idComprobante].revision_motivo = "";
        if (motivo) motivo.value = "";
      }

      actualizarResumenRevision(detalle);
    });
  });

  tabla.querySelectorAll(".motivo-rechazo").forEach((campo) => {
    campo.addEventListener("input", () => {
      const idComprobante = campo.dataset.idComprobante;
      if (window.revisionesComprobantes[idComprobante]) {
        window.revisionesComprobantes[idComprobante].revision_motivo = campo.value.trim();
      }
      campo.classList.remove("is-invalid");
    });
  });
}


function actualizarResumenRevision(detalle) {
  const bloque = document.getElementById("resumenRevisionComprobantes");
  if (!bloque) return;

  bloque.classList.remove("d-none");

  const revisiones = Object.values(window.revisionesComprobantes || {});
  const presentado = revisiones.reduce((suma, item) => suma + item.monto, 0);
  const autorizado = revisiones
    .filter((item) => item.estado_comprobante === "AUTORIZADO")
    .reduce((suma, item) => suma + item.monto, 0);
  const rechazado = revisiones
    .filter((item) => item.estado_comprobante === "RECHAZADO")
    .reduce((suma, item) => suma + item.monto, 0);
  const pendiente = revisiones
    .filter((item) => !["AUTORIZADO", "RECHAZADO"].includes(item.estado_comprobante))
    .reduce((suma, item) => suma + item.monto, 0);

  asignarTexto("totalPresentadoRevision", formatearDinero(presentado));
  asignarTexto("totalAutorizadoRevision", formatearDinero(autorizado));
  asignarTexto("totalRechazadoRevision", formatearDinero(rechazado));
  asignarTexto("totalPendienteRevision", formatearDinero(pendiente));

  const estado = normalizarEstado(detalle.estado_rendicion);
  const revisionAbierta = Boolean(detalle.puede_revisar) && estado === "PENDIENTE";
  const texto = document.getElementById("textoRevisionComprobantes");
  const boton = document.getElementById("btnFinalizarRevision");

  if (texto) {
    texto.textContent = revisionAbierta
      ? "Revise cada comprobante. Para rechazar uno debe registrar obligatoriamente el motivo."
      : "Esta revisión se encuentra cerrada o su usuario no posee permiso para modificarla.";
  }

  boton?.classList.toggle("d-none", !revisionAbierta);
}


// ======================================================
// FINALIZAR REVISIÓN
// ======================================================

async function finalizarRevisionComprobantes() {
  const detalle = window.detalleRendicionActual;

  if (!detalle?.ID || !detalle.puede_revisar) {
    mostrarMensajeRevision("No tiene permiso para revisar esta rendición.", "danger");
    return;
  }

  const revisiones = Object.values(window.revisionesComprobantes || {});

  if (!revisiones.length) {
    mostrarMensajeRevision("La rendición no contiene comprobantes para revisar.", "warning");
    return;
  }

  const pendientes = revisiones.filter(
    (item) => !["AUTORIZADO", "RECHAZADO"].includes(item.estado_comprobante)
  );

  if (pendientes.length) {
    mostrarMensajeRevision(
      `Debe autorizar o rechazar los ${pendientes.length} comprobante(s) pendientes.`,
      "warning"
    );
    return;
  }

  let motivoInvalido = false;
  revisiones.forEach((item) => {
    if (item.estado_comprobante === "RECHAZADO" && !item.revision_motivo.trim()) {
      motivoInvalido = true;
      document
        .querySelector(`.motivo-rechazo[data-id-comprobante="${selectorSeguro(item.id_comprobante)}"]`)
        ?.classList.add("is-invalid");
    }
  });

  if (motivoInvalido) {
    mostrarMensajeRevision("Indique el motivo de todos los comprobantes rechazados.", "danger");
    return;
  }

  const autorizados = revisiones.filter((item) => item.estado_comprobante === "AUTORIZADO");
  const rechazados = revisiones.filter((item) => item.estado_comprobante === "RECHAZADO");
  const montoAutorizado = autorizados.reduce((suma, item) => suma + item.monto, 0);
  const montoRechazado = rechazados.reduce((suma, item) => suma + item.monto, 0);

  const confirmar = window.confirm(
    `¿Finalizar la revisión ${detalle.ID}?\n\n` +
    `Autorizados: ${autorizados.length} (${formatearDinero(montoAutorizado)})\n` +
    `Rechazados: ${rechazados.length} (${formatearDinero(montoRechazado)})\n\n` +
    "La decisión quedará registrada y la revisión se cerrará."
  );

  if (!confirmar) return;

  const boton = document.getElementById("btnFinalizarRevision");
  const contenidoOriginal = boton?.innerHTML || "";

  try {
    if (boton) {
      boton.disabled = true;
      boton.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
        Guardando revisión...
      `;
    }

    mostrarMensajeRevision("Guardando la revisión de comprobantes...", "info");

    if (typeof solicitarAppsScript !== "function") {
      throw new Error("No se encontró la función de conexión con Apps Script.");
    }

    const payload = revisiones.map((item) => ({
      id_comprobante: item.id_comprobante,
      estado: item.estado_comprobante,
      motivo: item.estado_comprobante === "RECHAZADO"
        ? item.revision_motivo.trim()
        : ""
    }));

    const resultado = await solicitarAppsScript({
      accion: "finalizar_revision_comprobantes",
      id: detalle.ID,
      revisiones: JSON.stringify(payload)
    });

    if (!resultado || resultado.ok !== true) {
      throw new Error(resultado?.error || "No fue posible finalizar la revisión.");
    }

    mostrarMensajeRevision("Revisión finalizada correctamente. Actualizando detalle...", "success");

    window.setTimeout(() => {
      window.location.reload();
    }, 900);
  } catch (error) {
    console.error("Error finalizando revisión:", error);
    mostrarMensajeRevision(error.message || "No fue posible finalizar la revisión.", "danger");

    if (boton) {
      boton.disabled = false;
      boton.innerHTML = contenidoOriginal;
    }
  }
}


// ======================================================
// ESTADO Y AUTORIZACIÓN HISTÓRICA
// ======================================================

function actualizarEstadoRendicion(detalle) {
  const badge = document.getElementById("detalleEstado");
  if (!badge) return;

  const estado = normalizarEstado(detalle.estado_rendicion);
  const configuraciones = {
    AUTORIZADA: ["badge bg-success", "Autorizada"],
    AUTORIZADA_PARCIAL: ["badge bg-primary", "Autorizada parcialmente"],
    RECHAZADA: ["badge bg-danger", "Rechazada"],
    PENDIENTE: ["badge bg-warning text-dark", "Pendiente"]
  };
  const configuracion = configuraciones[estado] || ["badge bg-secondary", estado];

  badge.className = configuracion[0];
  badge.textContent = configuracion[1];
}


function renderizarAutorizacion(detalle) {
  const bloque = document.getElementById("bloqueAutorizacion");
  const datos = document.getElementById("datosAutorizacion");
  const nombre = document.getElementById("autorizadoNombre");
  const fecha = document.getElementById("autorizadoEn");
  const botonAntiguo = document.getElementById("btnAutorizarRendicion");
  const estado = normalizarEstado(detalle.estado_rendicion);
  const finalizada = estado !== "PENDIENTE";

  bloque?.classList.remove("d-none");
  datos?.classList.toggle("d-none", !finalizada);

  if (nombre) {
    nombre.textContent = detalle.autorizado_nombre || detalle.autorizado_por || "-";
  }

  if (fecha) {
    fecha.textContent = formatearFechaHora(detalle.autorizado_en);
  }

  // V7 reemplaza la autorización total directa por revisión individual.
  if (botonAntiguo) {
    botonAntiguo.classList.add("d-none");
    botonAntiguo.disabled = true;
  }
}


// Se conserva por compatibilidad con el onclick del HTML antiguo.
function autorizarRendicion() {
  mostrarMensajeAutorizacion(
    "La autorización ahora se realiza comprobante por comprobante.",
    "info"
  );
  document.getElementById("resumenRevisionComprobantes")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}


// ======================================================
// MENSAJES
// ======================================================

function mostrarMensajeRevision(mensaje, tipo = "info") {
  const contenedor = document.getElementById("mensajeRevision");
  if (!contenedor) return;

  contenedor.className = `alert alert-${tipo} mt-3 mb-0`;
  contenedor.textContent = mensaje;
  contenedor.classList.remove("d-none");
}


function mostrarMensajeAutorizacion(mensaje, tipo = "info") {
  const contenedor = document.getElementById("mensajeAutorizacion");
  if (!contenedor) return;

  contenedor.className = `alert alert-${tipo} mt-3 mb-0`;
  contenedor.textContent = mensaje;
  contenedor.classList.remove("d-none");
}


function mostrarErrorTabla(tabla, mensaje) {
  tabla.innerHTML = `
    <tr>
      <td colspan="8" class="text-center text-danger">
        ${escaparHTML(mensaje)}
      </td>
    </tr>
  `;
}


// ======================================================
// UTILIDADES
// ======================================================

function normalizarEstado(valor) {
  return String(valor || "PENDIENTE").trim().toUpperCase();
}


function convertirMonto(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

  const texto = String(valor).trim().replace(/\s/g, "").replace(/\$/g, "");
  const limpio = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto.replace(/\./g, "");

  return Number(limpio) || 0;
}


function formatearDinero(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(valor);
}


function formatearFechaHora(valor) {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return fecha.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function asignarTexto(id, valor) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = valor;
}


function selectorSeguro(valor) {
  if (window.CSS?.escape) return window.CSS.escape(String(valor));
  return String(valor).replace(/["\\]/g, "\\$&");
}


function escaparHTML(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escaparAtributo(valor) {
  return escaparHTML(valor);
}
