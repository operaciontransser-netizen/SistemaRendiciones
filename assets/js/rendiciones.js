document.addEventListener("DOMContentLoaded", async () => {
  console.log("rendiciones.js iniciado");

  const tabla = document.getElementById("tablaRendiciones");
  const totalRendiciones = document.getElementById("totalRendiciones");
  const buscador = document.getElementById("buscarRendicion");

  if (!tabla || !totalRendiciones || !buscador) {
    console.error("No se encontraron elementos de la página Rendiciones.");
    return;
  }

  tabla.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        Cargando rendiciones...
      </td>
    </tr>
  `;

  const rendiciones = await obtenerDatosGoogleSheets();

  console.log("Rendiciones recibidas:", rendiciones);

  if (!Array.isArray(rendiciones)) {
    tabla.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          Error al cargar las rendiciones.
        </td>
      </tr>
    `;
    return;
  }

  totalRendiciones.textContent = rendiciones.length;

  // ======================================================
  // FECHAS Y ORDEN
  // ======================================================

  function obtenerTiempoProcesado(fecha) {
    if (!fecha) {
      return Number.NEGATIVE_INFINITY;
    }

    const texto = String(fecha).trim();

    if (!texto) {
      return Number.NEGATIVE_INFINITY;
    }

    // Formato chileno: dd-mm-yyyy o dd/mm/yyyy,
    // opcionalmente acompañado de hora.
    const fechaChilena = texto.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (fechaChilena) {
      const dia = Number(fechaChilena[1]);
      const mes = Number(fechaChilena[2]) - 1;
      const anio = Number(fechaChilena[3]);
      const hora = Number(fechaChilena[4] || 0);
      const minuto = Number(fechaChilena[5] || 0);
      const segundo = Number(fechaChilena[6] || 0);

      return new Date(
        anio,
        mes,
        dia,
        hora,
        minuto,
        segundo
      ).getTime();
    }

    // Formatos ISO: yyyy-mm-dd o fecha/hora completa.
    const tiempo = Date.parse(texto);

    return Number.isNaN(tiempo)
      ? Number.NEGATIVE_INFINITY
      : tiempo;
  }

  function ordenarPorFechaDescendente(lista) {
    return lista
      .map((rendicion, indiceOriginal) => ({
        rendicion,
        indiceOriginal,
        tiempo: obtenerTiempoProcesado(rendicion.procesado_en)
      }))
      .sort((a, b) => {
        if (a.tiempo !== b.tiempo) {
          return b.tiempo - a.tiempo;
        }

        // Si dos rendiciones tienen la misma fecha,
        // conservamos el orden recibido desde la API.
        return a.indiceOriginal - b.indiceOriginal;
      })
      .map((elemento) => elemento.rendicion);
  }

  function formatearFecha(fecha) {
    if (!fecha) {
      return "-";
    }

    const texto = String(fecha).trim();

    const fechaISO = texto.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (fechaISO) {
      return `${fechaISO[3]}-${fechaISO[2]}-${fechaISO[1]}`;
    }

    const fechaChilena = texto.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/
    );

    if (fechaChilena) {
      const dia = fechaChilena[1].padStart(2, "0");
      const mes = fechaChilena[2].padStart(2, "0");
      const anio = fechaChilena[3];

      return `${dia}-${mes}-${anio}`;
    }

    const fechaObjeto = new Date(texto);

    if (Number.isNaN(fechaObjeto.getTime())) {
      return texto;
    }

    return fechaObjeto.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  const rendicionesOrdenadas = ordenarPorFechaDescendente(rendiciones);

  // ======================================================
  // PRESENTACIÓN DEL ESTADO
  // ======================================================

  function obtenerEstadoRendicion(rendicion) {
    return String(rendicion.estado_rendicion || "PENDIENTE")
      .trim()
      .toUpperCase();
  }

  function crearBadgeEstado(rendicion) {
    const estado = obtenerEstadoRendicion(rendicion);

    if (estado === "AUTORIZADA") {
      return `
        <span class="badge bg-success">
          Autorizada
        </span>
      `;
    }

    return `
      <span class="badge bg-warning text-dark">
        Pendiente
      </span>
    `;
  }

  // ======================================================
  // RENDERIZAR TABLA
  // ======================================================

  function renderizar(lista) {
    if (!lista.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted">
            No se encontraron rendiciones.
          </td>
        </tr>
      `;
      return;
    }

    tabla.innerHTML = lista
      .map((rendicion) => {
        const id = String(rendicion.ID || "").trim();
        const fechaRendicion = formatearFecha(rendicion.procesado_en);

        return `
          <tr>
            <td>
              <strong>${escaparHTML(id || "-")}</strong>
            </td>

            <td>${escaparHTML(fechaRendicion)}</td>

            <td>
              ${escaparHTML(rendicion.colaborador || "-")}
            </td>

            <td>
              ${escaparHTML(rendicion.numero_viaje || "-")}
            </td>

            <td>
              ${Number(rendicion.cantidad_documentos) || 0}
            </td>

            <td>${crearBadgeEstado(rendicion)}</td>

            <td class="text-center">
              <button
                type="button"
                class="btn btn-sm btn-primary btn-ver-rendicion"
                data-id="${escaparHTML(id)}"
              >
                <i class="bi bi-eye"></i>
                Ver
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    tabla
      .querySelectorAll(".btn-ver-rendicion")
      .forEach((boton) => {
        boton.addEventListener("click", () => {
          verRendicion(boton.dataset.id);
        });
      });
  }

  renderizar(rendicionesOrdenadas);

  // ======================================================
  // BUSCADOR
  // ======================================================

  buscador.addEventListener("input", () => {
    const texto = buscador.value.toLowerCase().trim();

    const filtradas = rendicionesOrdenadas.filter((rendicion) => {
      const id = String(rendicion.ID || "").toLowerCase();
      const colaborador = String(rendicion.colaborador || "").toLowerCase();
      const viaje = String(rendicion.numero_viaje || "").toLowerCase();
      const fecha = formatearFecha(rendicion.procesado_en).toLowerCase();
      const estado = obtenerEstadoRendicion(rendicion).toLowerCase();

      return (
        id.includes(texto) ||
        colaborador.includes(texto) ||
        viaje.includes(texto) ||
        fecha.includes(texto) ||
        estado.includes(texto)
      );
    });

    renderizar(filtradas);
  });
});


// ======================================================
// ABRIR DETALLE
// ======================================================

function verRendicion(id) {
  if (!id) {
    return;
  }

  window.location.href =
    `detalle-rendicion.html?id=${encodeURIComponent(id)}`;
}


// ======================================================
// SEGURIDAD DE TEXTO
// ======================================================

function escaparHTML(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
