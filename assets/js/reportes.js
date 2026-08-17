document.addEventListener("DOMContentLoaded", async () => {
  console.log("reportes.js iniciado");

  const elementos = {
    fechaDesde: document.getElementById("filtroFechaDesde"),
    fechaHasta: document.getElementById("filtroFechaHasta"),
    colaborador: document.getElementById("filtroColaborador"),
    estado: document.getElementById("filtroEstado"),
    aplicar: document.getElementById("btnAplicarFiltros"),
    limpiar: document.getElementById("btnLimpiarFiltros"),
    exportarCSV: document.getElementById("btnExportarCSV"),
    exportarExcel: document.getElementById("btnExportarExcel"),
    exportarPDF: document.getElementById("btnExportarPDF"),
    depositado: document.getElementById("reporteDepositado"),
    rendido: document.getElementById("reporteRendido"),
    porRendir: document.getElementById("reportePorRendir"),
    saldoFavor: document.getElementById("reporteSaldoFavor"),
    cantidadRendiciones: document.getElementById("reporteCantidadRendiciones"),
    grafico: document.getElementById("graficoDistribucionFinanciera"),
    alertas: document.getElementById("alertasReportes"),
    tablaSaldos: document.getElementById("tablaReporteSaldos"),
    tablaRendiciones: document.getElementById("tablaReporteRendiciones")
  };

  if (
    !elementos.tablaSaldos ||
    !elementos.tablaRendiciones ||
    !elementos.aplicar
  ) {
    console.error("No se encontraron los elementos requeridos de Reportes.");
    return;
  }

  let resumenFinanciero = {};
  let colaboradores = [];
  let rendiciones = [];
  let colaboradoresFiltrados = [];
  let rendicionesFiltradas = [];

  mostrarCarga();

  try {
    const resultados = await Promise.all([
      solicitarAppsScript({ resumen: "1" }),
      solicitarAppsScript({ colaboradores: "1" }),
      solicitarAppsScript()
    ]);

    resumenFinanciero = resultados[0] || {};
    colaboradores = Array.isArray(resultados[1]) ? resultados[1] : [];
    rendiciones = Array.isArray(resultados[2]) ? resultados[2] : [];

    rendiciones.sort(compararRendicionesDescendente);
    cargarSelectorColaboradores();
    aplicarFiltros();
  } catch (error) {
    console.error("Error cargando Reportes:", error);
    mostrarError(error.message || "No fue posible cargar los reportes.");
  }

  elementos.aplicar.addEventListener("click", aplicarFiltros);

  elementos.limpiar.addEventListener("click", () => {
    elementos.fechaDesde.value = "";
    elementos.fechaHasta.value = "";
    elementos.colaborador.value = "";
    elementos.estado.value = "";
    aplicarFiltros();
  });

  elementos.exportarCSV.addEventListener("click", exportarCSV);
  elementos.exportarExcel.addEventListener("click", exportarExcel);
  elementos.exportarPDF.addEventListener("click", exportarPDF);

  function mostrarCarga() {
    elementos.tablaSaldos.innerHTML = filaMensaje(6, "Cargando saldos...");
    elementos.tablaRendiciones.innerHTML = filaMensaje(7, "Cargando rendiciones...");
  }

  function mostrarError(mensaje) {
    const texto = escaparHTML(mensaje);
    elementos.tablaSaldos.innerHTML = filaMensaje(6, texto, "text-danger");
    elementos.tablaRendiciones.innerHTML = filaMensaje(7, texto, "text-danger");
    elementos.alertas.innerHTML = `
      <div class="list-group-item text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>${texto}
      </div>
    `;
  }

  function cargarSelectorColaboradores() {
    const opciones = colaboradores
      .slice()
      .sort((a, b) => String(a.colaborador || "").localeCompare(
        String(b.colaborador || ""),
        "es",
        { sensitivity: "base" }
      ))
      .map((item) => {
        const rut = String(item.rut || "").trim();
        const nombre = String(item.colaborador || rut || "Sin nombre").trim();
        return `<option value="${escaparHTML(rut)}">${escaparHTML(nombre)}</option>`;
      })
      .join("");

    elementos.colaborador.innerHTML = `
      <option value="">Todos los colaboradores</option>
      ${opciones}
    `;
  }

  function aplicarFiltros() {
    const desde = convertirFechaFiltro(elementos.fechaDesde.value, false);
    const hasta = convertirFechaFiltro(elementos.fechaHasta.value, true);
    const rutSeleccionado = normalizarRut(elementos.colaborador.value);
    const estadoSeleccionado = String(elementos.estado.value || "")
      .trim()
      .toUpperCase();

    if (desde && hasta && desde.getTime() > hasta.getTime()) {
      alert("La fecha Desde no puede ser posterior a la fecha Hasta.");
      return;
    }

    colaboradoresFiltrados = colaboradores.filter((item) => {
      if (!rutSeleccionado) return true;
      return normalizarRut(item.rut) === rutSeleccionado;
    });

    rendicionesFiltradas = rendiciones.filter((item) => {
      const fecha = convertirFecha(item.procesado_en);
      const rut = normalizarRut(item.rut || extraerRut(item.colaborador));
      const estado = obtenerEstado(item);

      if (rutSeleccionado && rut !== rutSeleccionado) return false;
      if (estadoSeleccionado && estado !== estadoSeleccionado) return false;
      if (desde && (!fecha || fecha.getTime() < desde.getTime())) return false;
      if (hasta && (!fecha || fecha.getTime() > hasta.getTime())) return false;

      return true;
    });

    rendicionesFiltradas.sort(compararRendicionesDescendente);

    renderizarResumen();
    renderizarSaldos();
    renderizarRendiciones();
    renderizarGrafico();
    renderizarAlertas();
  }

  function renderizarResumen() {
    elementos.depositado.textContent = formatearDinero(
      resumenFinanciero.monto_depositado
    );
    elementos.rendido.textContent = formatearDinero(
      resumenFinanciero.monto_rendido
    );
    elementos.porRendir.textContent = formatearDinero(
      resumenFinanciero.monto_por_rendir
    );
    elementos.saldoFavor.textContent = formatearDinero(
      resumenFinanciero.monto_favor_colaboradores
    );
    elementos.cantidadRendiciones.textContent = rendicionesFiltradas.length;
  }

  function renderizarSaldos() {
    if (!colaboradoresFiltrados.length) {
      elementos.tablaSaldos.innerHTML = filaMensaje(
        6,
        "No se encontraron colaboradores."
      );
      return;
    }

    elementos.tablaSaldos.innerHTML = colaboradoresFiltrados
      .map((item) => {
        const saldo = numero(item.saldo);
        let claseSaldo = "text-muted";
        let textoSaldo = formatearDinero(0);

        if (saldo > 0) {
          claseSaldo = "text-danger";
          textoSaldo = formatearDinero(saldo);
        } else if (saldo < 0) {
          claseSaldo = "text-success";
          textoSaldo = `${formatearDinero(Math.abs(saldo))} a favor`;
        }

        const folio = String(item.ultima_rendicion_id || "").trim();
        const ultimaRendicion = folio
          ? `<a href="detalle-rendicion.html?id=${encodeURIComponent(folio)}">
               ${escaparHTML(folio)}
             </a>
             <small class="d-block text-muted">
               ${escaparHTML(formatearFecha(item.ultima_rendicion_en))}
             </small>`
          : '<span class="text-muted">Sin rendiciones</span>';

        return `
          <tr>
            <td>
              <strong>${escaparHTML(item.colaborador || "-")}</strong>
              <small class="d-block text-muted">${escaparHTML(item.rut || "-")}</small>
            </td>
            <td>${escaparHTML(item.centro_costo || "-")}</td>
            <td class="text-end">${formatearDinero(item.monto_asignado)}</td>
            <td class="text-end">${formatearDinero(item.monto_rendido)}</td>
            <td class="text-end ${claseSaldo}"><strong>${textoSaldo}</strong></td>
            <td>${ultimaRendicion}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderizarRendiciones() {
    if (!rendicionesFiltradas.length) {
      elementos.tablaRendiciones.innerHTML = filaMensaje(
        7,
        "No se encontraron rendiciones para los filtros seleccionados."
      );
      return;
    }

    elementos.tablaRendiciones.innerHTML = rendicionesFiltradas
      .map((item) => {
        const estado = obtenerEstado(item);
        const claseEstado = estado === "AUTORIZADA"
          ? "bg-success"
          : "bg-warning text-dark";

        return `
          <tr>
            <td>
              <a href="detalle-rendicion.html?id=${encodeURIComponent(item.ID || "")}">
                <strong>${escaparHTML(item.ID || "-")}</strong>
              </a>
            </td>
            <td>${escaparHTML(formatearFecha(item.procesado_en))}</td>
            <td>${escaparHTML(item.colaborador || "-")}</td>
            <td>${escaparHTML(item.numero_viaje || "-")}</td>
            <td>${numero(item.cantidad_documentos)}</td>
            <td><span class="badge ${claseEstado}">${formatearEstado(estado)}</span></td>
            <td class="text-end text-muted" title="La API aún no entrega el monto por folio">-</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderizarGrafico() {
    const depositado = numero(resumenFinanciero.monto_depositado);
    const rendido = numero(resumenFinanciero.monto_rendido);
    const porRendir = numero(resumenFinanciero.monto_por_rendir);
    const favor = numero(resumenFinanciero.monto_favor_colaboradores);
    const base = Math.max(depositado, rendido + porRendir + favor, 1);

    elementos.grafico.innerHTML = `
      <div class="w-100 p-4">
        ${crearBarra("Rendido", rendido, base, "bg-success")}
        ${crearBarra("Por rendir", porRendir, base, "bg-warning")}
        ${crearBarra("A favor de colaboradores", favor, base, "bg-info")}
      </div>
    `;
  }

  function crearBarra(etiqueta, valor, base, clase) {
    const porcentaje = Math.max(0, Math.min(100, (valor / base) * 100));

    return `
      <div class="mb-4">
        <div class="d-flex justify-content-between mb-1">
          <span>${escaparHTML(etiqueta)}</span>
          <strong>${formatearDinero(valor)}</strong>
        </div>
        <div class="progress" style="height: 18px;">
          <div
            class="progress-bar ${clase}"
            role="progressbar"
            style="width: ${porcentaje.toFixed(2)}%;"
            aria-valuenow="${porcentaje.toFixed(0)}"
            aria-valuemin="0"
            aria-valuemax="100"
          ></div>
        </div>
      </div>
    `;
  }

  function renderizarAlertas() {
    const pendientes = rendicionesFiltradas.filter(
      (item) => obtenerEstado(item) === "PENDIENTE"
    ).length;
    const saldoPendiente = colaboradoresFiltrados.filter(
      (item) => numero(item.saldo) > 0
    ).length;
    const saldoFavor = colaboradoresFiltrados.filter(
      (item) => numero(item.saldo) < 0
    ).length;

    elementos.alertas.innerHTML = `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        Rendiciones pendientes
        <span class="badge bg-warning text-dark rounded-pill">${pendientes}</span>
      </div>
      <div class="list-group-item d-flex justify-content-between align-items-center">
        Colaboradores con saldo por rendir
        <span class="badge bg-danger rounded-pill">${saldoPendiente}</span>
      </div>
      <div class="list-group-item d-flex justify-content-between align-items-center">
        Colaboradores con saldo a favor
        <span class="badge bg-info text-dark rounded-pill">${saldoFavor}</span>
      </div>
    `;
  }

  function exportarCSV() {
    const filas = obtenerFilasExportacion();

    if (!filas.length) {
      alert("No existen rendiciones para exportar con los filtros actuales.");
      return;
    }

    const encabezados = [
      "Folio",
      "Fecha",
      "Colaborador",
      "RUT",
      "Viaje",
      "Documentos",
      "Estado"
    ];

    const contenido = [encabezados, ...filas]
      .map((fila) => fila.map(escaparCSV).join(";"))
      .join("\r\n");

    descargarArchivo(
      `reporte_rendiciones_${fechaArchivo()}.csv`,
      `\uFEFF${contenido}`,
      "text/csv;charset=utf-8;"
    );
  }

  function exportarExcel() {
    const filas = obtenerFilasExportacion();

    if (!filas.length) {
      alert("No existen rendiciones para exportar con los filtros actuales.");
      return;
    }

    const encabezados = [
      "Folio",
      "Fecha",
      "Colaborador",
      "RUT",
      "Viaje",
      "Documentos",
      "Estado"
    ];

    const tabla = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead><tr>${encabezados.map((x) => `<th>${escaparHTML(x)}</th>`).join("")}</tr></thead>
            <tbody>
              ${filas.map((fila) => `<tr>${fila.map((x) => `<td>${escaparHTML(x)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    descargarArchivo(
      `reporte_rendiciones_${fechaArchivo()}.xls`,
      tabla,
      "application/vnd.ms-excel;charset=utf-8;"
    );
  }

  function exportarPDF() {
    window.print();
  }

  function obtenerFilasExportacion() {
    return rendicionesFiltradas.map((item) => [
      String(item.ID || ""),
      formatearFecha(item.procesado_en),
      String(item.colaborador || ""),
      String(item.rut || extraerRut(item.colaborador) || ""),
      String(item.numero_viaje || ""),
      String(numero(item.cantidad_documentos)),
      formatearEstado(obtenerEstado(item))
    ]);
  }

  function descargarArchivo(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  }
});


// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function numero(valor) {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function formatearDinero(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(numero(valor));
}

function convertirFecha(valor) {
  if (!valor) return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor;
  }

  const texto = String(valor).trim();
  const chilena = texto.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);

  if (chilena) {
    const fecha = new Date(
      Number(chilena[3]),
      Number(chilena[2]) - 1,
      Number(chilena[1])
    );
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function convertirFechaFiltro(valor, finDelDia) {
  if (!valor) return null;

  const partes = String(valor).split("-").map(Number);
  if (partes.length !== 3) return null;

  return new Date(
    partes[0],
    partes[1] - 1,
    partes[2],
    finDelDia ? 23 : 0,
    finDelDia ? 59 : 0,
    finDelDia ? 59 : 0,
    finDelDia ? 999 : 0
  );
}

function formatearFecha(valor) {
  const fecha = convertirFecha(valor);
  if (!fecha) return "-";

  return fecha.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function compararRendicionesDescendente(a, b) {
  const fechaA = convertirFecha(a.procesado_en);
  const fechaB = convertirFecha(b.procesado_en);
  const tiempoA = fechaA ? fechaA.getTime() : Number.NEGATIVE_INFINITY;
  const tiempoB = fechaB ? fechaB.getTime() : Number.NEGATIVE_INFINITY;

  if (tiempoB !== tiempoA) return tiempoB - tiempoA;

  return String(b.ID || "").localeCompare(String(a.ID || ""), "es", {
    numeric: true,
    sensitivity: "base"
  });
}

function obtenerEstado(rendicion) {
  return String(rendicion.estado_rendicion || "PENDIENTE")
    .trim()
    .toUpperCase();
}

function formatearEstado(estado) {
  return estado === "AUTORIZADA" ? "Autorizada" : "Pendiente";
}

function extraerRut(colaborador) {
  return String(colaborador || "").split("/")[0].trim();
}

function normalizarRut(valor) {
  return String(valor || "")
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
}

function filaMensaje(columnas, mensaje, clase = "text-muted") {
  return `
    <tr>
      <td colspan="${columnas}" class="text-center ${clase}">
        ${mensaje}
      </td>
    </tr>
  `;
}

function escaparCSV(valor) {
  const texto = String(valor ?? "");
  return `"${texto.replace(/"/g, '""')}"`;
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function fechaArchivo() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}
