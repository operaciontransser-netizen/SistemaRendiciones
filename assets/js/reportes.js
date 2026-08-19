document.addEventListener("DOMContentLoaded", async () => {
  console.log("reportes.js V8 iniciado");

  const elementos = {
    fechaDesde: document.getElementById("filtroFechaDesde"),
    fechaHasta: document.getElementById("filtroFechaHasta"),
    contenedorEmpresa: document.getElementById("contenedorFiltroEmpresa"),
    empresa: document.getElementById("filtroEmpresa"),
    colaborador: document.getElementById("filtroColaborador"),
    estado: document.getElementById("filtroEstado"),
    aplicar: document.getElementById("btnAplicarFiltros"),
    limpiar: document.getElementById("btnLimpiarFiltros"),
    exportarCSV: document.getElementById("btnExportarCSV"),
    exportarExcel: document.getElementById("btnExportarExcel"),
    exportarPDF: document.getElementById("btnExportarPDF"),
    depositado: document.getElementById("reporteDepositado"),
    presentado: document.getElementById("reportePresentado"),
    autorizado: document.getElementById("reporteAutorizado"),
    pendienteRevision: document.getElementById("reportePendienteRevision"),
    rechazado: document.getElementById("reporteRechazado"),
    porRendir: document.getElementById("reportePorRendir"),
    saldoFavor: document.getElementById("reporteSaldoFavor"),
    cantidadRendiciones: document.getElementById("reporteCantidadRendiciones"),
    cantidadRechazadosTab: document.getElementById("cantidadRechazadosTab"),
    totalRechazadosFiltrados: document.getElementById("totalRechazadosFiltrados"),
    grafico: document.getElementById("graficoDistribucionFinanciera"),
    alertas: document.getElementById("alertasReportes"),
    tablaSaldos: document.getElementById("tablaReporteSaldos"),
    tablaRendiciones: document.getElementById("tablaReporteRendiciones"),
    tablaRechazados: document.getElementById("tablaReporteRechazados")
  };

  if (
    !elementos.tablaSaldos ||
    !elementos.tablaRendiciones ||
    !elementos.tablaRechazados ||
    !elementos.aplicar
  ) {
    console.error("No se encontraron los elementos requeridos de Reportes.");
    return;
  }

  const usuario = obtenerUsuarioActual();

  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  const esSuperAdmin = normalizarRol(usuario.rol) === "SUPER ADMIN";
  let empresaActiva = "";
  let resumenFinanciero = {};
  let colaboradores = [];
  let rendiciones = [];
  let comprobantesRechazados = [];
  let colaboradoresFiltrados = [];
  let rendicionesFiltradas = [];
  let rechazadosFiltrados = [];

  mostrarCarga();

  try {
    await configurarSelectorEmpresa();
    await cargarDatos();
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
  elementos.exportarPDF.addEventListener("click", () => window.print());

  async function configurarSelectorEmpresa() {
    if (!esSuperAdmin) {
      localStorage.removeItem("empresaSeleccionada");
      return;
    }

    const empresas = await solicitarAppsScript({ empresas: "1" });

    if (!Array.isArray(empresas)) {
      throw new Error("No fue posible obtener el listado de empresas.");
    }

    elementos.empresa.innerHTML = `
      <option value="">Todas las empresas</option>
      ${empresas.map((item) => {
        const codigo = String(item.codigo_empresa || "").trim();
        const nombre = String(item.nombre_empresa || codigo || "Empresa").trim();
        return `<option value="${escaparHTML(codigo)}">${escaparHTML(nombre)}</option>`;
      }).join("")}
    `;

    const guardada = localStorage.getItem("empresaSeleccionada") || "";
    const valida = !guardada || empresas.some(
      (item) => String(item.codigo_empresa || "").trim() === guardada
    );

    empresaActiva = valida ? guardada : "";
    elementos.empresa.value = empresaActiva;
    elementos.contenedorEmpresa.classList.remove("d-none");

    elementos.empresa.addEventListener("change", async () => {
      empresaActiva = elementos.empresa.value;
      localStorage.setItem("empresaSeleccionada", empresaActiva);
      mostrarCarga();

      try {
        await cargarDatos();
      } catch (error) {
        console.error("Error cambiando empresa:", error);
        mostrarError(error.message || "No fue posible cambiar la empresa.");
      }
    });
  }

  function parametrosConEmpresa(adicionales = {}) {
    const parametros = { ...adicionales };

    if (esSuperAdmin && empresaActiva) {
      parametros.empresa = empresaActiva;
    }

    return parametros;
  }

  async function cargarDatos() {
    const resultados = await Promise.all([
      solicitarAppsScript(parametrosConEmpresa({ resumen: "1" })),
      solicitarAppsScript(parametrosConEmpresa({ colaboradores: "1" })),
      solicitarAppsScript(parametrosConEmpresa()),
      solicitarAppsScript(parametrosConEmpresa({ comprobantes_rechazados: "1" }))
    ]);

    resumenFinanciero = resultados[0] || {};
    colaboradores = Array.isArray(resultados[1]) ? resultados[1] : [];
    rendiciones = Array.isArray(resultados[2]) ? resultados[2] : [];
    comprobantesRechazados = Array.isArray(resultados[3]) ? resultados[3] : [];

    rendiciones.sort(compararRendicionesDescendente);
    comprobantesRechazados.sort(compararRechazadosDescendente);
    cargarSelectorColaboradores();
    aplicarFiltros();
  }

  function mostrarCarga() {
    elementos.tablaSaldos.innerHTML = filaMensaje(9, "Cargando saldos...");
    elementos.tablaRendiciones.innerHTML = filaMensaje(7, "Cargando rendiciones...");
    elementos.tablaRechazados.innerHTML = filaMensaje(
      10,
      "Cargando comprobantes rechazados..."
    );
  }

  function mostrarError(mensaje) {
    const texto = escaparHTML(mensaje);
    elementos.tablaSaldos.innerHTML = filaMensaje(9, texto, "text-danger");
    elementos.tablaRendiciones.innerHTML = filaMensaje(7, texto, "text-danger");
    elementos.tablaRechazados.innerHTML = filaMensaje(10, texto, "text-danger");
    elementos.alertas.innerHTML = `
      <div class="list-group-item text-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>${texto}
      </div>
    `;
  }

  function cargarSelectorColaboradores() {
    const valorActual = elementos.colaborador.value;
    const rutsIncluidos = new Set();
    const opciones = colaboradores
      .slice()
      .sort((a, b) => String(a.colaborador || "").localeCompare(
        String(b.colaborador || ""),
        "es",
        { sensitivity: "base" }
      ))
      .filter((item) => {
        const rut = normalizarRut(item.rut);
        if (!rut || rutsIncluidos.has(rut)) return false;
        rutsIncluidos.add(rut);
        return true;
      })
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

    if ([...elementos.colaborador.options].some((opcion) => opcion.value === valorActual)) {
      elementos.colaborador.value = valorActual;
    }
  }

  function aplicarFiltros() {
    const desde = convertirFechaFiltro(elementos.fechaDesde.value, false);
    const hasta = convertirFechaFiltro(elementos.fechaHasta.value, true);
    const rutSeleccionado = normalizarRut(elementos.colaborador.value);
    const estadoSeleccionado = obtenerEstadoDesdeTexto(elementos.estado.value);

    if (desde && hasta && desde.getTime() > hasta.getTime()) {
      alert("La fecha Desde no puede ser posterior a la fecha Hasta.");
      return;
    }

    colaboradoresFiltrados = colaboradores.filter((item) => {
      return !rutSeleccionado || normalizarRut(item.rut) === rutSeleccionado;
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

    const estadosPorFolio = {};
    rendiciones.forEach((item) => {
      estadosPorFolio[String(item.ID || "").trim()] = obtenerEstado(item);
    });

    rechazadosFiltrados = comprobantesRechazados.filter((item) => {
      const fecha = convertirFecha(item.revisado_en);
      const rut = normalizarRut(item.rut || extraerRut(item.colaborador));
      const estadoRendicion = estadosPorFolio[String(item.id_rendicion || "").trim()] || "";

      if (rutSeleccionado && rut !== rutSeleccionado) return false;
      if (estadoSeleccionado && estadoRendicion !== estadoSeleccionado) return false;
      if (desde && (!fecha || fecha.getTime() < desde.getTime())) return false;
      if (hasta && (!fecha || fecha.getTime() > hasta.getTime())) return false;
      return true;
    });

    rendicionesFiltradas.sort(compararRendicionesDescendente);
    rechazadosFiltrados.sort(compararRechazadosDescendente);

    renderizarResumen(rutSeleccionado);
    renderizarSaldos();
    renderizarRendiciones();
    renderizarRechazados();
    renderizarGrafico(rutSeleccionado);
    renderizarAlertas();
  }

  function obtenerResumenVisible(rutSeleccionado) {
    if (!rutSeleccionado) return resumenFinanciero;

    return colaboradoresFiltrados.reduce((total, item) => {
      total.monto_depositado += numero(item.monto_asignado);
      total.monto_presentado += numero(item.monto_presentado);
      total.monto_autorizado += numero(item.monto_autorizado || item.monto_rendido);
      total.monto_pendiente_revision += numero(item.monto_pendiente_revision);
      total.monto_rechazado += numero(item.monto_rechazado);

      const saldo = numero(item.saldo);
      if (saldo > 0) total.monto_por_rendir += saldo;
      if (saldo < 0) total.monto_favor_colaboradores += Math.abs(saldo);
      return total;
    }, {
      monto_depositado: 0,
      monto_presentado: 0,
      monto_autorizado: 0,
      monto_pendiente_revision: 0,
      monto_rechazado: 0,
      monto_por_rendir: 0,
      monto_favor_colaboradores: 0
    });
  }

  function renderizarResumen(rutSeleccionado) {
    const resumen = obtenerResumenVisible(rutSeleccionado);
    elementos.depositado.textContent = formatearDinero(resumen.monto_depositado);
    elementos.presentado.textContent = formatearDinero(resumen.monto_presentado);
    elementos.autorizado.textContent = formatearDinero(
      resumen.monto_autorizado || resumen.monto_rendido
    );
    elementos.pendienteRevision.textContent = formatearDinero(
      resumen.monto_pendiente_revision
    );
    elementos.rechazado.textContent = formatearDinero(resumen.monto_rechazado);
    elementos.porRendir.textContent = formatearDinero(resumen.monto_por_rendir);
    elementos.saldoFavor.textContent = formatearDinero(
      resumen.monto_favor_colaboradores
    );
    elementos.cantidadRendiciones.textContent = rendicionesFiltradas.length;
  }

  function renderizarSaldos() {
    if (!colaboradoresFiltrados.length) {
      elementos.tablaSaldos.innerHTML = filaMensaje(9, "No se encontraron colaboradores.");
      return;
    }

    elementos.tablaSaldos.innerHTML = colaboradoresFiltrados.map((item) => {
      const saldo = numero(item.saldo);
      const claseSaldo = saldo > 0 ? "text-danger" : saldo < 0 ? "text-success" : "text-muted";
      const textoSaldo = saldo < 0
        ? `${formatearDinero(Math.abs(saldo))} a favor`
        : formatearDinero(saldo);
      const folio = String(item.ultima_rendicion_id || "").trim();
      const ultimaRendicion = folio
        ? `<a href="detalle-rendicion.html?id=${encodeURIComponent(folio)}">
             ${escaparHTML(folio)}
           </a>
           <small class="d-block text-muted">${escaparHTML(formatearFecha(item.ultima_rendicion_en))}</small>`
        : '<span class="text-muted">Sin rendiciones</span>';

      return `
        <tr>
          <td>
            <strong>${escaparHTML(item.colaborador || "-")}</strong>
            <small class="d-block text-muted">${escaparHTML(item.rut || "-")}</small>
          </td>
          <td>${escaparHTML(item.centro_costo || "-")}</td>
          <td class="text-end">${formatearDinero(item.monto_asignado)}</td>
          <td class="text-end">${formatearDinero(item.monto_presentado)}</td>
          <td class="text-end text-success">${formatearDinero(item.monto_autorizado || item.monto_rendido)}</td>
          <td class="text-end text-warning">${formatearDinero(item.monto_pendiente_revision)}</td>
          <td class="text-end text-danger">${formatearDinero(item.monto_rechazado)}</td>
          <td class="text-end ${claseSaldo}"><strong>${textoSaldo}</strong></td>
          <td>${ultimaRendicion}</td>
        </tr>
      `;
    }).join("");
  }

  function renderizarRendiciones() {
    if (!rendicionesFiltradas.length) {
      elementos.tablaRendiciones.innerHTML = filaMensaje(
        7,
        "No se encontraron rendiciones para los filtros seleccionados."
      );
      return;
    }

    elementos.tablaRendiciones.innerHTML = rendicionesFiltradas.map((item) => {
      const estado = obtenerEstado(item);
      const monto = obtenerMontoRendicion(item);

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
          <td><span class="badge ${claseEstado(estado)}">${formatearEstado(estado)}</span></td>
          <td class="text-end">${monto === null ? '<span class="text-muted">-</span>' : formatearDinero(monto)}</td>
        </tr>
      `;
    }).join("");
  }

  function renderizarRechazados() {
    const total = rechazadosFiltrados.reduce(
      (acumulado, item) => acumulado + numero(item.monto_total),
      0
    );

    elementos.cantidadRechazadosTab.textContent = rechazadosFiltrados.length;
    elementos.totalRechazadosFiltrados.textContent = formatearDinero(total);

    if (!rechazadosFiltrados.length) {
      elementos.tablaRechazados.innerHTML = filaMensaje(
        10,
        "No existen comprobantes rechazados para los filtros seleccionados."
      );
      return;
    }

    elementos.tablaRechazados.innerHTML = rechazadosFiltrados.map((item) => {
      const folio = String(item.id_rendicion || "").trim();
      const respaldo = item.fotografia
        ? `<a href="${escaparHTML(item.fotografia)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">
             <i class="bi bi-eye"></i> Ver
           </a>`
        : '<span class="text-muted">Sin respaldo</span>';

      return `
        <tr>
          <td>${escaparHTML(formatearFechaHora(item.revisado_en))}</td>
          <td>
            <a href="detalle-rendicion.html?id=${encodeURIComponent(folio)}">
              <strong>${escaparHTML(folio || "-")}</strong>
            </a>
          </td>
          <td>
            ${escaparHTML(item.colaborador || "-")}
            <small class="d-block text-muted">${escaparHTML(item.rut || "-")}</small>
          </td>
          <td>${escaparHTML(item.empresa || "-")}</td>
          <td>
            ${escaparHTML(item.numero_documento || "-")}
            <small class="d-block text-muted">${escaparHTML(formatearFecha(item.fecha_documento))}</small>
          </td>
          <td>${escaparHTML(item.proveedor || "-")}</td>
          <td class="text-end text-danger"><strong>${formatearDinero(item.monto_total)}</strong></td>
          <td>${escaparHTML(item.motivo_rechazo || "-")}</td>
          <td>
            ${escaparHTML(item.revisado_nombre || "-")}
            <small class="d-block text-muted">${escaparHTML(item.revisado_por || "-")}</small>
          </td>
          <td class="text-center">${respaldo}</td>
        </tr>
      `;
    }).join("");
  }

  function renderizarGrafico(rutSeleccionado) {
    const resumen = obtenerResumenVisible(rutSeleccionado);
    const presentado = numero(resumen.monto_presentado);
    const autorizado = numero(resumen.monto_autorizado || resumen.monto_rendido);
    const pendiente = numero(resumen.monto_pendiente_revision);
    const rechazado = numero(resumen.monto_rechazado);
    const base = Math.max(presentado, autorizado + pendiente + rechazado, 1);

    elementos.grafico.innerHTML = `
      <div class="w-100 p-4">
        ${crearBarra("Presentado", presentado, base, "bg-primary")}
        ${crearBarra("Autorizado", autorizado, base, "bg-success")}
        ${crearBarra("Pendiente de revisión", pendiente, base, "bg-warning")}
        ${crearBarra("Rechazado", rechazado, base, "bg-danger")}
      </div>
    `;
  }

  function crearBarra(etiqueta, valor, base, clase) {
    const porcentaje = Math.max(0, Math.min(100, (valor / base) * 100));

    return `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <span>${escaparHTML(etiqueta)}</span>
          <strong>${formatearDinero(valor)}</strong>
        </div>
        <div class="progress" style="height: 18px;">
          <div class="progress-bar ${clase}" role="progressbar"
               style="width: ${porcentaje.toFixed(2)}%;"
               aria-valuenow="${porcentaje.toFixed(0)}"
               aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </div>
    `;
  }

  function renderizarAlertas() {
    const pendientes = rendicionesFiltradas.filter(
      (item) => obtenerEstado(item) === "PENDIENTE"
    ).length;
    const parciales = rendicionesFiltradas.filter(
      (item) => obtenerEstado(item) === "AUTORIZADA_PARCIAL"
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
        Rendiciones autorizadas parcialmente
        <span class="badge bg-primary rounded-pill">${parciales}</span>
      </div>
      <div class="list-group-item d-flex justify-content-between align-items-center">
        Comprobantes rechazados
        <span class="badge bg-danger rounded-pill">${rechazadosFiltrados.length}</span>
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

  function obtenerExportacionActiva() {
    const activa = document.querySelector('.nav-link.active[data-bs-target]');
    const destino = activa ? activa.getAttribute("data-bs-target") : "#reporteRendiciones";

    if (destino === "#reporteRechazados") {
      return {
        nombre: "comprobantes_rechazados",
        encabezados: [
          "Fecha revisión", "Rendición", "Colaborador", "RUT", "Empresa",
          "N° documento", "Fecha documento", "Proveedor", "Monto",
          "Motivo rechazo", "Revisado por", "Correo revisor", "Fotografía"
        ],
        filas: rechazadosFiltrados.map((item) => [
          formatearFechaHora(item.revisado_en),
          item.id_rendicion || "",
          item.colaborador || "",
          item.rut || "",
          item.empresa || "",
          item.numero_documento || "",
          formatearFecha(item.fecha_documento),
          item.proveedor || "",
          numero(item.monto_total),
          item.motivo_rechazo || "",
          item.revisado_nombre || "",
          item.revisado_por || "",
          item.fotografia || ""
        ])
      };
    }

    if (destino === "#reporteSaldos") {
      return {
        nombre: "saldos_colaboradores",
        encabezados: [
          "Colaborador", "RUT", "Empresa", "Centro de costo", "Asignado",
          "Presentado", "Autorizado", "Pendiente revisión", "Rechazado", "Saldo"
        ],
        filas: colaboradoresFiltrados.map((item) => [
          item.colaborador || "",
          item.rut || "",
          item.empresa || "",
          item.centro_costo || "",
          numero(item.monto_asignado),
          numero(item.monto_presentado),
          numero(item.monto_autorizado || item.monto_rendido),
          numero(item.monto_pendiente_revision),
          numero(item.monto_rechazado),
          numero(item.saldo)
        ])
      };
    }

    return {
      nombre: "rendiciones",
      encabezados: ["Folio", "Fecha", "Colaborador", "RUT", "Viaje", "Documentos", "Estado"],
      filas: rendicionesFiltradas.map((item) => [
        item.ID || "",
        formatearFecha(item.procesado_en),
        item.colaborador || "",
        item.rut || extraerRut(item.colaborador) || "",
        item.numero_viaje || "",
        numero(item.cantidad_documentos),
        formatearEstado(obtenerEstado(item))
      ])
    };
  }

  function exportarCSV() {
    const reporte = obtenerExportacionActiva();

    if (!reporte.filas.length) {
      alert("No existen datos para exportar con los filtros actuales.");
      return;
    }

    const contenido = [reporte.encabezados, ...reporte.filas]
      .map((fila) => fila.map(escaparCSV).join(";"))
      .join("\r\n");

    descargarArchivo(
      `${reporte.nombre}_${fechaArchivo()}.csv`,
      `\uFEFF${contenido}`,
      "text/csv;charset=utf-8;"
    );
  }

  function exportarExcel() {
    const reporte = obtenerExportacionActiva();

    if (!reporte.filas.length) {
      alert("No existen datos para exportar con los filtros actuales.");
      return;
    }

    const tabla = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1">
            <thead><tr>${reporte.encabezados.map((x) => `<th>${escaparHTML(x)}</th>`).join("")}</tr></thead>
            <tbody>
              ${reporte.filas.map((fila) => `<tr>${fila.map((x) => `<td>${escaparHTML(x)}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    descargarArchivo(
      `${reporte.nombre}_${fechaArchivo()}.xls`,
      tabla,
      "application/vnd.ms-excel;charset=utf-8;"
    );
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

function normalizarRol(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

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
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;

  const texto = String(valor).trim();
  const chilena = texto.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (chilena) {
    const fecha = new Date(
      Number(chilena[3]),
      Number(chilena[2]) - 1,
      Number(chilena[1]),
      Number(chilena[4] || 0),
      Number(chilena[5] || 0),
      Number(chilena[6] || 0)
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
    partes[0], partes[1] - 1, partes[2],
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

function formatearFechaHora(valor) {
  const fecha = convertirFecha(valor);
  if (!fecha) return "-";
  return fecha.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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

function compararRechazadosDescendente(a, b) {
  const fechaA = convertirFecha(a.revisado_en);
  const fechaB = convertirFecha(b.revisado_en);
  return (fechaB ? fechaB.getTime() : 0) - (fechaA ? fechaA.getTime() : 0);
}

function obtenerEstado(rendicion) {
  return obtenerEstadoDesdeTexto(rendicion.estado_rendicion || "PENDIENTE");
}

function obtenerEstadoDesdeTexto(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function formatearEstado(estado) {
  const estados = {
    PENDIENTE: "Pendiente",
    AUTORIZADA: "Autorizada",
    AUTORIZADA_PARCIAL: "Autorizada parcialmente",
    RECHAZADA: "Rechazada"
  };
  return estados[estado] || estado || "Pendiente";
}

function claseEstado(estado) {
  const clases = {
    PENDIENTE: "bg-warning text-dark",
    AUTORIZADA: "bg-success",
    AUTORIZADA_PARCIAL: "bg-primary",
    RECHAZADA: "bg-danger"
  };
  return clases[estado] || "bg-secondary";
}

function obtenerMontoRendicion(item) {
  const campos = ["total_presentado", "monto_presentado", "monto_total", "total_rendicion"];
  const encontrado = campos.find(
    (campo) => item[campo] !== undefined && item[campo] !== null && item[campo] !== ""
  );
  return encontrado ? numero(item[encontrado]) : null;
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
      <td colspan="${columnas}" class="text-center ${clase}">${mensaje}</td>
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
