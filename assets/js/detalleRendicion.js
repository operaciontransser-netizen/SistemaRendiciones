document.addEventListener("DOMContentLoaded", async () => {
  console.log("detalleRendicion.js iniciado");

  const parametros =
    new URLSearchParams(window.location.search);

  const id =
    parametros.get("id");

  const tabla =
    document.getElementById("tablaDocumentos");

  const folio =
    document.getElementById("detalleFolio");

  const colaborador =
    document.getElementById("detalleColaborador");

  const viaje =
    document.getElementById("detalleViaje");

  const total =
    document.getElementById("totalRendicion");

  if (
    !tabla ||
    !folio ||
    !colaborador ||
    !viaje ||
    !total
  ) {
    console.error(
      "No se encontraron los elementos del detalle."
    );

    return;
  }

  if (!id) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          No se indicó un ID de rendición.
        </td>
      </tr>
    `;

    return;
  }

  tabla.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted">
        <div
          class="spinner-border spinner-border-sm me-2"
          role="status"
        ></div>

        Cargando documentos...
      </td>
    </tr>
  `;

  const detalle =
    await obtenerDatosGoogleSheets(id);

  console.log(
    "Detalle recibido:",
    detalle
  );

  if (
    !detalle ||
    !Array.isArray(detalle.documentos)
  ) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          No fue posible cargar la rendición.
        </td>
      </tr>
    `;

    return;
  }

  window.detalleRendicionActual =
    detalle;

  folio.textContent =
    detalle.ID || "-";

  colaborador.textContent =
    detalle.colaborador || "-";

  viaje.textContent =
    detalle.numero_viaje || "-";

  actualizarEstadoRendicion(
    detalle
  );

  renderizarAutorizacion(
    detalle
  );

  let totalRendicion = 0;

  if (!detalle.documentos.length) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted">
          La rendición no tiene documentos.
        </td>
      </tr>
    `;

  } else {
    tabla.innerHTML =
      detalle.documentos
        .map((doc) => {
          const monto =
            convertirMonto(
              doc.monto_total
            );

          totalRendicion +=
            monto;

          // Prioridad:
          // 1. Fotografía guardada en Google Drive.
          // 2. Enlace antiguo de JotForm como respaldo.
          const urlComprobante =
            doc.fotografia ||
            doc.FOTOGRAFIA ||
            doc.archivo_url ||
            "";

          return `
            <tr>
              <td>
                ${escaparHTML(doc.fecha_documento || "-")}
              </td>

              <td>
                ${escaparHTML(doc.numero_documento || "-")}
              </td>

              <td>
                ${escaparHTML(doc.proveedor || "-")}
              </td>

              <td>
                ${escaparHTML(doc.tipo_documento || "-")}
              </td>

              <td>
                ${escaparHTML(doc.descripcion || "-")}
              </td>

              <td class="text-end">
                ${formatearDinero(monto)}
              </td>

              <td class="text-center">
                ${
                  urlComprobante
                    ? `
                      <a
                        href="${escaparAtributo(urlComprobante)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-sm btn-outline-primary"
                      >
                        <i class="bi bi-eye"></i>
                        Ver
                      </a>
                    `
                    : `
                      <span class="text-muted">
                        Sin respaldo
                      </span>
                    `
                }
              </td>
            </tr>
          `;
        })
        .join("");
  }

  total.textContent =
    formatearDinero(
      totalRendicion
    );
});


// ======================================================
// ACTUALIZAR ESTADO
// ======================================================

function actualizarEstadoRendicion(
  detalle
) {
  const badge =
    document.getElementById(
      "detalleEstado"
    );

  if (!badge) {
    return;
  }

  const estado =
    String(
      detalle.estado_rendicion ||
      "PENDIENTE"
    )
      .trim()
      .toUpperCase();

  if (estado === "AUTORIZADA") {
    badge.className =
      "badge bg-success";

    badge.textContent =
      "Autorizada";

    return;
  }

  badge.className =
    "badge bg-warning text-dark";

  badge.textContent =
    "Pendiente";
}


// ======================================================
// MOSTRAR AUTORIZACIÓN Y BOTÓN
// ======================================================

function renderizarAutorizacion(
  detalle
) {
  const usuario =
    obtenerUsuarioActual();

  const bloqueAutorizacion =
    document.getElementById(
      "bloqueAutorizacion"
    );

  const datosAutorizacion =
    document.getElementById(
      "datosAutorizacion"
    );

  const autorizadoNombre =
    document.getElementById(
      "autorizadoNombre"
    );

  const autorizadoEn =
    document.getElementById(
      "autorizadoEn"
    );

  const btnAutorizar =
    document.getElementById(
      "btnAutorizarRendicion"
    );

  const estado =
    String(
      detalle.estado_rendicion ||
      "PENDIENTE"
    )
      .trim()
      .toUpperCase();

  const rol =
    String(
      usuario?.rol || ""
    )
      .trim()
      .toUpperCase();

  const esJefeArea =
    rol === "ADMIN";

  const estaAutorizada =
    estado === "AUTORIZADA";

  if (bloqueAutorizacion) {
    bloqueAutorizacion.classList.remove(
      "d-none"
    );
  }

  if (datosAutorizacion) {
    datosAutorizacion.classList.toggle(
      "d-none",
      !estaAutorizada
    );
  }

  if (autorizadoNombre) {
    autorizadoNombre.textContent =
      detalle.autorizado_nombre ||
      detalle.autorizado_por ||
      "-";
  }

  if (autorizadoEn) {
    autorizadoEn.textContent =
      formatearFechaHora(
        detalle.autorizado_en
      );
  }

  if (btnAutorizar) {
    const mostrarBoton =
      esJefeArea &&
      !estaAutorizada;

    btnAutorizar.classList.toggle(
      "d-none",
      !mostrarBoton
    );

    btnAutorizar.disabled =
      !mostrarBoton;
  }
}


// ======================================================
// AUTORIZAR RENDICIÓN
// ======================================================

async function autorizarRendicion() {
  const detalle =
    window.detalleRendicionActual;

  if (
    !detalle ||
    !detalle.ID
  ) {
    mostrarMensajeAutorizacion(
      "No se encontró el folio de la rendición.",
      "danger"
    );

    return;
  }

  const usuario =
    obtenerUsuarioActual();

  const rol =
    String(
      usuario?.rol || ""
    )
      .trim()
      .toUpperCase();

  if (rol !== "ADMIN") {
    mostrarMensajeAutorizacion(
      "Solo el Jefe de Área puede autorizar rendiciones.",
      "danger"
    );

    return;
  }

  const confirmar =
    window.confirm(
      `¿Autorizar la rendición ${detalle.ID}? Esta acción quedará registrada.`
    );

  if (!confirmar) {
    return;
  }

  const boton =
    document.getElementById(
      "btnAutorizarRendicion"
    );

  const contenidoOriginal =
    boton
      ? boton.innerHTML
      : "";

  try {
    if (boton) {
      boton.disabled = true;

      boton.innerHTML = `
        <span
          class="spinner-border spinner-border-sm me-2"
          role="status"
        ></span>

        Autorizando...
      `;
    }

    mostrarMensajeAutorizacion(
      "Procesando autorización...",
      "info"
    );

    const resultado =
      await autorizarRendicionGoogleSheets(
        detalle.ID
      );

    if (
      !resultado ||
      resultado.ok !== true
    ) {
      throw new Error(
        resultado?.error ||
        "No fue posible autorizar la rendición."
      );
    }

    detalle.estado_rendicion =
      resultado.estado_rendicion ||
      "AUTORIZADA";

    detalle.autorizado_por =
      resultado.autorizado_por ||
      "";

    detalle.autorizado_nombre =
      resultado.autorizado_nombre ||
      "";

    detalle.autorizado_en =
      resultado.autorizado_en ||
      "";

    window.detalleRendicionActual =
      detalle;

    actualizarEstadoRendicion(
      detalle
    );

    renderizarAutorizacion(
      detalle
    );

    mostrarMensajeAutorizacion(
      resultado.ya_autorizada
        ? "La rendición ya se encontraba autorizada."
        : "Rendición autorizada correctamente.",
      "success"
    );

  } catch (error) {
    console.error(
      "Error autorizando rendición:",
      error
    );

    mostrarMensajeAutorizacion(
      error.message ||
      "No fue posible autorizar la rendición.",
      "danger"
    );

    if (boton) {
      boton.disabled = false;

      boton.innerHTML =
        contenidoOriginal;
    }
  }
}


// ======================================================
// MENSAJE DE AUTORIZACIÓN
// ======================================================

function mostrarMensajeAutorizacion(
  mensaje,
  tipo = "info"
) {
  const contenedor =
    document.getElementById(
      "mensajeAutorizacion"
    );

  if (!contenedor) {
    return;
  }

  contenedor.className =
    `alert alert-${tipo} mt-3 mb-0`;

  contenedor.textContent =
    mensaje;

  contenedor.classList.remove(
    "d-none"
  );
}


// ======================================================
// UTILIDADES
// ======================================================

function convertirMonto(valor) {
  if (!valor) {
    return 0;
  }

  const limpio =
    String(valor)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/\s/g, "");

  return Number(limpio) || 0;
}


function formatearDinero(valor) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }
  ).format(valor);
}


function formatearFechaHora(valor) {
  if (!valor) {
    return "-";
  }

  const fecha =
    new Date(valor);

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return String(valor);
  }

  return fecha.toLocaleString(
    "es-CL",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
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