(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    esperarDetalleRendicion();
  });

  function esperarDetalleRendicion(intentos = 0) {
    const detalle = window.detalleRendicionActual;

    if (detalle) {
      renderizarDuplicados(detalle);
      return;
    }

    if (intentos < 100) {
      window.setTimeout(function () {
        esperarDetalleRendicion(intentos + 1);
      }, 100);
    }
  }

  function renderizarDuplicados(detalle) {
    const documentosDuplicados = Array.isArray(detalle.documentos_duplicados)
      ? detalle.documentos_duplicados
      : [];

    const idActual = normalizar(detalle.ID);

    const duplicadosActuales = documentosDuplicados.filter(function (documento) {
      const idRendicionActual = normalizar(documento.id_rendicion_actual);

      return !idRendicionActual || idRendicionActual === idActual;
    });

    if (!duplicadosActuales.length) {
      return;
    }

    const tablaDocumentos = document.getElementById("tablaDocumentos");
    const tarjetaDocumentos = tablaDocumentos
      ? tablaDocumentos.closest(".card")
      : null;

    if (!tarjetaDocumentos || document.getElementById("seccionDuplicados")) {
      return;
    }

    const totalDuplicado = duplicadosActuales.reduce(function (acumulado, documento) {
      return acumulado + convertirMonto(documento.monto_total);
    }, 0);

    const seccion = document.createElement("div");
    seccion.id = "seccionDuplicados";
    seccion.className = "card mb-4 border-warning";

    seccion.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>
          <i class="bi bi-exclamation-triangle me-2 text-warning"></i>
          Comprobantes excluidos por duplicidad
        </strong>

        <span class="badge bg-warning text-dark">
          ${duplicadosActuales.length}
          ${duplicadosActuales.length === 1 ? "comprobante" : "comprobantes"}
        </span>
      </div>

      <div class="card-body">
        <div class="alert alert-warning mb-3">
          Estos comprobantes fueron presentados originalmente en esta rendición,
          pero el sistema los excluyó porque ya existían en rendiciones anteriores.
          No forman parte de los documentos ni de los totales de esta rendición.
        </div>

        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>N° Documento</th>
                <th>Proveedor</th>
                <th class="text-end">Monto</th>
                <th>Rendición original</th>
                <th>Colaborador original</th>
                <th class="text-center">Respaldo</th>
              </tr>
            </thead>

            <tbody>
              ${duplicadosActuales.map(crearFilaDuplicado).join("")}
            </tbody>

            <tfoot>
              <tr>
                <th colspan="3" class="text-end">
                  Total excluido
                </th>
                <th class="text-end text-danger">
                  ${formatearDinero(totalDuplicado)}
                </th>
                <th colspan="3"></th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    tarjetaDocumentos.insertAdjacentElement("afterend", seccion);
  }

  function crearFilaDuplicado(documento) {
    const idOriginal = normalizar(documento.id_rendicion_original);
    const respaldo =
      documento.fotografia_original ||
      documento.archivo_url_actual ||
      "";

    const enlaceRendicionOriginal = idOriginal
      ? `
          <a
            href="detalle-rendicion.html?id=${encodeURIComponent(idOriginal)}"
            class="fw-semibold"
          >
            ${escaparHTML(idOriginal)}
          </a>
        `
      : '<span class="text-muted">Sin folio</span>';

    const enlaceRespaldo = respaldo
      ? `
          <a
            href="${escaparAtributo(respaldo)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-outline-primary"
          >
            <i class="bi bi-eye"></i>
            Ver
          </a>
        `
      : '<span class="text-muted">Sin respaldo</span>';

    return `
      <tr>
        <td>${escaparHTML(formatearFecha(documento.fecha_documento))}</td>
        <td>${escaparHTML(documento.numero_documento || "-")}</td>
        <td>${escaparHTML(documento.proveedor || "-")}</td>
        <td class="text-end text-danger fw-semibold">
          ${formatearDinero(convertirMonto(documento.monto_total))}
        </td>
        <td>${enlaceRendicionOriginal}</td>
        <td>${escaparHTML(documento.colaborador_original || "-")}</td>
        <td class="text-center">${enlaceRespaldo}</td>
      </tr>
    `;
  }

  function normalizar(valor) {
    return String(valor || "").trim().toUpperCase();
  }

  function convertirMonto(valor) {
    if (typeof valor === "number") {
      return Number.isFinite(valor) ? valor : 0;
    }

    const limpio = String(valor || "")
      .replace(/\$/g, "")
      .replace(/\s/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "");

    return Number(limpio) || 0;
  }

  function formatearDinero(valor) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }).format(valor);
  }

  function formatearFecha(valor) {
    if (!valor) {
      return "-";
    }

    const texto = String(valor).trim();
    const fechaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (fechaISO) {
      return `${fechaISO[3]}-${fechaISO[2]}-${fechaISO[1]}`;
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return texto;
    }

    return fecha.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function escaparHTML(valor) {
    return String(valor || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escaparAtributo(valor) {
    return escaparHTML(valor);
  }
})();
