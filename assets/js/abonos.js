document.addEventListener("DOMContentLoaded", async () => {
  const usuario = obtenerUsuarioActual();

  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  const estado = {
    usuario,
    colaboradores: [],
    abonos: [],
    idAbonoAnular: ""
  };

  const elementos = {
    nombreUsuario: document.getElementById("nombreUsuario"),
    btnCerrarSesion: document.getElementById("btnCerrarSesion"),
    selectorEmpresa: document.getElementById("selectorEmpresa"),
    contenedorSelectorEmpresa: document.getElementById("contenedorSelectorEmpresa"),
    alerta: document.getElementById("alertaAbonos"),
    seccionRegistrar: document.getElementById("seccionRegistrarAbono"),
    formRegistrar: document.getElementById("formRegistrarAbono"),
    colaborador: document.getElementById("abonoColaborador"),
    fecha: document.getElementById("abonoFecha"),
    monto: document.getElementById("abonoMonto"),
    medioPago: document.getElementById("abonoMedioPago"),
    referencia: document.getElementById("abonoReferencia"),
    comprobante: document.getElementById("abonoComprobante"),
    observacion: document.getElementById("abonoObservacion"),
    btnRegistrar: document.getElementById("btnRegistrarAbono"),
    filtroColaborador: document.getElementById("filtroColaboradorAbonos"),
    filtroEstado: document.getElementById("filtroEstadoAbonos"),
    buscar: document.getElementById("buscarAbono"),
    btnActualizar: document.getElementById("btnActualizarAbonos"),
    tabla: document.getElementById("tablaAbonos"),
    montoActivos: document.getElementById("montoAbonosActivos"),
    cantidadActivos: document.getElementById("cantidadAbonosActivos"),
    montoMes: document.getElementById("montoAbonosMes"),
    cantidadAnulados: document.getElementById("cantidadAbonosAnulados"),
    formAnular: document.getElementById("formAnularAbono"),
    motivoAnulacion: document.getElementById("motivoAnulacion"),
    detalleAnular: document.getElementById("detalleAbonoAnular"),
    btnConfirmarAnulacion: document.getElementById("btnConfirmarAnulacion"),
    cartolaColaborador: document.getElementById("cartolaColaborador"),
    cartolaTotalAbonos: document.getElementById("cartolaTotalAbonos"),
    cartolaTotalRendido: document.getElementById("cartolaTotalRendido"),
    cartolaSaldoActual: document.getElementById("cartolaSaldoActual"),
    tablaCartola: document.getElementById("tablaCartola")
  };

  const modalCartola = new bootstrap.Modal(
    document.getElementById("modalCartola")
  );
  const modalAnular = new bootstrap.Modal(
    document.getElementById("modalAnularAbono")
  );

  elementos.nombreUsuario.textContent =
    usuario.nombre || usuario.email;
  elementos.fecha.value = obtenerFechaLocalISO();

  elementos.btnCerrarSesion.addEventListener("click", () => {
    localStorage.removeItem("usuarioActual");
    localStorage.removeItem("empresaSeleccionada");
    window.location.href = "login.html";
  });

  const rol = normalizarRolUsuario(usuario.rol);
  const puedeAdministrar =
    rol === "ADMIN" || rol === "SUPER ADMIN";

  if (!puedeAdministrar) {
    elementos.seccionRegistrar.classList.add("d-none");
  }

  configurarEventos();

  try {
    await configurarSelectorEmpresa();
    await cargarModulo();
  } catch (error) {
    console.error("Error iniciando Fondos y Abonos:", error);
    mostrarAlerta(
      error.message || "No fue posible cargar el módulo.",
      "danger"
    );
    mostrarErrorTabla(error.message);
  }

  function configurarEventos() {
    elementos.formRegistrar.addEventListener("submit", registrarAbono);
    elementos.formAnular.addEventListener("submit", confirmarAnulacion);
    elementos.btnActualizar.addEventListener("click", cargarAbonos);
    elementos.filtroColaborador.addEventListener("change", aplicarFiltros);
    elementos.filtroEstado.addEventListener("change", aplicarFiltros);
    elementos.buscar.addEventListener("input", aplicarFiltros);

    elementos.tabla.addEventListener("click", (evento) => {
      const botonCartola = evento.target.closest(".btn-cartola-abono");
      const botonAnular = evento.target.closest(".btn-anular-abono");

      if (botonCartola) {
        abrirCartola(botonCartola.dataset.rut);
      }

      if (botonAnular) {
        prepararAnulacion(botonAnular.dataset.id);
      }
    });
  }

  async function configurarSelectorEmpresa() {
    if (!esUsuarioSuperAdmin(usuario)) {
      return;
    }

    elementos.contenedorSelectorEmpresa.classList.remove("d-none");
    const empresas = await obtenerEmpresasGoogleSheets();

    elementos.selectorEmpresa.innerHTML = `
      <option value="">Todas las empresas</option>
      ${empresas.map((empresa) => {
        const codigo = String(
          empresa.codigo_empresa || empresa.empresa || ""
        ).trim();
        const nombre = String(
          empresa.nombre_empresa || codigo
        ).trim();

        return `
          <option value="${escaparHTMLAbonos(codigo)}">
            ${escaparHTMLAbonos(nombre)}
          </option>
        `;
      }).join("")}
    `;

    elementos.selectorEmpresa.value = obtenerEmpresaSeleccionada();
    elementos.selectorEmpresa.addEventListener("change", async () => {
      guardarEmpresaSeleccionada(elementos.selectorEmpresa.value);
      await cargarModulo();
    });
  }

  async function cargarModulo() {
    ocultarAlerta();
    await Promise.all([
      cargarColaboradores(),
      cargarAbonos()
    ]);
  }

  async function cargarColaboradores() {
    const colaboradores = await solicitarAppsScript({
      colaboradores: "1"
    });

    if (!Array.isArray(colaboradores)) {
      throw new Error("No se recibió un listado válido de colaboradores.");
    }

    estado.colaboradores = colaboradores
      .slice()
      .sort((a, b) => String(a.colaborador || "").localeCompare(
        String(b.colaborador || ""),
        "es",
        { sensitivity: "base" }
      ));

    const opciones = estado.colaboradores.map((item) => `
      <option value="${escaparHTMLAbonos(item.rut || "")}">
        ${escaparHTMLAbonos(item.colaborador || item.rut || "-")}
      </option>
    `).join("");

    elementos.colaborador.innerHTML = `
      <option value="">Seleccione un colaborador</option>
      ${opciones}
    `;
    elementos.filtroColaborador.innerHTML = `
      <option value="">Todos los colaboradores</option>
      ${opciones}
    `;
  }

  async function cargarAbonos() {
    elementos.btnActualizar.disabled = true;
    elementos.tabla.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <div class="spinner-border spinner-border-sm me-2" role="status"></div>
          Cargando abonos...
        </td>
      </tr>
    `;

    try {
      const abonos = await obtenerAbonosGoogleSheets({
        estado: "TODOS"
      });

      if (!Array.isArray(abonos)) {
        throw new Error("No se recibió un historial válido de abonos.");
      }

      estado.abonos = abonos;
      actualizarIndicadores();
      aplicarFiltros();
    } catch (error) {
      mostrarErrorTabla(error.message);
      throw error;
    } finally {
      elementos.btnActualizar.disabled = false;
    }
  }

  async function registrarAbono(evento) {
    evento.preventDefault();

    if (!elementos.formRegistrar.checkValidity()) {
      elementos.formRegistrar.classList.add("was-validated");
      return;
    }

    const monto = Number(elementos.monto.value);

    if (!Number.isFinite(monto) || monto <= 0) {
      mostrarAlerta("El monto debe ser mayor que cero.", "warning");
      return;
    }

    elementos.btnRegistrar.disabled = true;
    elementos.btnRegistrar.innerHTML = `
      <span class="spinner-border spinner-border-sm me-1"></span>
      Registrando...
    `;

    try {
      const respuesta = await registrarAbonoGoogleSheets({
        rut: elementos.colaborador.value,
        fecha: elementos.fecha.value,
        monto,
        medio_pago: elementos.medioPago.value,
        referencia: elementos.referencia.value.trim(),
        comprobante_url: elementos.comprobante.value.trim(),
        observacion: elementos.observacion.value.trim()
      });

      mostrarAlerta(
        respuesta.mensaje || "Abono registrado correctamente.",
        "success"
      );
      elementos.formRegistrar.reset();
      elementos.fecha.value = obtenerFechaLocalISO();
      elementos.medioPago.value = "TRANSFERENCIA";
      elementos.formRegistrar.classList.remove("was-validated");
      await cargarAbonos();
    } catch (error) {
      mostrarAlerta(error.message || "No fue posible registrar el abono.", "danger");
    } finally {
      elementos.btnRegistrar.disabled = false;
      elementos.btnRegistrar.innerHTML = `
        <i class="bi bi-save me-1"></i>
        Registrar abono
      `;
    }
  }

  function aplicarFiltros() {
    const rut = normalizarRutAbonos(elementos.filtroColaborador.value);
    const estadoFiltro = elementos.filtroEstado.value;
    const texto = elementos.buscar.value.toLowerCase().trim();

    const filtrados = estado.abonos.filter((abono) => {
      const coincideRut = !rut ||
        normalizarRutAbonos(abono.rut) === rut;
      const coincideEstado = estadoFiltro === "TODOS" ||
        String(abono.estado || "ACTIVO").toUpperCase() === estadoFiltro;
      const coincideTexto = !texto || [
        abono.id_abono,
        abono.colaborador,
        abono.empresa,
        abono.referencia,
        abono.observacion,
        abono.medio_pago
      ].some((valor) => String(valor || "").toLowerCase().includes(texto));

      return coincideRut && coincideEstado && coincideTexto;
    });

    renderizarAbonos(filtrados);
  }

  function renderizarAbonos(lista) {
    if (!lista.length) {
      elementos.tabla.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-4">
            No se encontraron abonos con los filtros seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    elementos.tabla.innerHTML = lista.map((abono) => {
      const estadoAbono = String(abono.estado || "ACTIVO").toUpperCase();
      const esAnulado = estadoAbono === "ANULADO";
      const puedeAnular = puedeAdministrar && Boolean(abono.anulable);
      const respaldo = String(abono.comprobante_url || "").trim();

      return `
        <tr class="${esAnulado ? "table-light text-muted" : ""}">
          <td>${escaparHTMLAbonos(formatearFechaAbonos(abono.fecha))}</td>
          <td>
            <span class="font-monospace small">${escaparHTMLAbonos(abono.id_abono || "-")}</span>
            ${abono.es_legacy ? '<div class="small text-muted">Histórico</div>' : ""}
          </td>
          <td>
            <strong>${escaparHTMLAbonos(abono.colaborador || "-")}</strong>
            <div class="small text-muted">${escaparHTMLAbonos(abono.rut || "")}</div>
          </td>
          <td>${escaparHTMLAbonos(abono.empresa || "-")}</td>
          <td>
            ${escaparHTMLAbonos(abono.referencia || abono.medio_pago || "-")}
            ${abono.observacion ? `<div class="small text-muted">${escaparHTMLAbonos(abono.observacion)}</div>` : ""}
          </td>
          <td class="text-end fw-semibold ${esAnulado ? "text-decoration-line-through" : ""}">
            ${formatearCLPAbonos(abono.monto)}
          </td>
          <td>
            ${esAnulado
              ? `<span class="badge bg-secondary">Anulado</span>
                 <div class="small mt-1">${escaparHTMLAbonos(abono.motivo_anulacion || "")}</div>`
              : `<span class="badge bg-success">Activo</span>`}
          </td>
          <td class="text-center text-nowrap">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary btn-cartola-abono"
              data-rut="${escaparHTMLAbonos(abono.rut || "")}"
              title="Ver cuenta corriente"
            >
              <i class="bi bi-journal-text"></i>
            </button>
            ${respaldo ? `
              <a
                href="${escaparHTMLAbonos(respaldo)}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm btn-outline-secondary"
                title="Ver comprobante"
              >
                <i class="bi bi-paperclip"></i>
              </a>
            ` : ""}
            ${puedeAnular ? `
              <button
                type="button"
                class="btn btn-sm btn-outline-danger btn-anular-abono"
                data-id="${escaparHTMLAbonos(abono.id_abono || "")}"
                title="Anular abono"
              >
                <i class="bi bi-x-circle"></i>
              </button>
            ` : ""}
          </td>
        </tr>
      `;
    }).join("");
  }

  function actualizarIndicadores() {
    const hoy = new Date();
    let montoActivos = 0;
    let cantidadActivos = 0;
    let montoMes = 0;
    let cantidadAnulados = 0;

    estado.abonos.forEach((abono) => {
      const esActivo = String(abono.estado || "ACTIVO").toUpperCase() !== "ANULADO";

      if (!esActivo) {
        cantidadAnulados += 1;
        return;
      }

      const monto = numeroAbonos(abono.monto);
      const fecha = convertirFechaAbonos(abono.fecha);
      montoActivos += monto;
      cantidadActivos += 1;

      if (
        fecha &&
        fecha.getFullYear() === hoy.getFullYear() &&
        fecha.getMonth() === hoy.getMonth()
      ) {
        montoMes += monto;
      }
    });

    elementos.montoActivos.textContent = formatearCLPAbonos(montoActivos);
    elementos.cantidadActivos.textContent = `${cantidadActivos} movimiento(s)`;
    elementos.montoMes.textContent = formatearCLPAbonos(montoMes);
    elementos.cantidadAnulados.textContent = cantidadAnulados;
  }

  async function abrirCartola(rut) {
    elementos.cartolaColaborador.textContent = "Cargando...";
    elementos.cartolaTotalAbonos.textContent = "-";
    elementos.cartolaTotalRendido.textContent = "-";
    elementos.cartolaSaldoActual.textContent = "-";
    elementos.tablaCartola.innerHTML = `
      <tr><td colspan="7" class="text-center text-muted py-4">Cargando cartola...</td></tr>
    `;
    modalCartola.show();

    try {
      const cartola = await obtenerCartolaGoogleSheets(rut);
      elementos.cartolaColaborador.textContent =
        `${cartola.colaborador || rut} · ${cartola.empresa || ""}`;
      elementos.cartolaTotalAbonos.textContent = formatearCLPAbonos(cartola.total_abonos);
      elementos.cartolaTotalRendido.textContent = formatearCLPAbonos(cartola.total_rendido);
      elementos.cartolaSaldoActual.textContent = formatearCLPAbonos(cartola.saldo_actual);
      elementos.cartolaSaldoActual.className =
        numeroAbonos(cartola.saldo_actual) < 0 ? "mb-0 text-info" : "mb-0";

      const movimientos = Array.isArray(cartola.movimientos)
        ? cartola.movimientos
        : [];

      elementos.tablaCartola.innerHTML = movimientos.length
        ? movimientos.map((movimiento) => `
            <tr>
              <td>${escaparHTMLAbonos(formatearFechaAbonos(movimiento.fecha))}</td>
              <td>
                <span class="badge ${movimiento.tipo === "ABONO" ? "bg-success" : "bg-primary"}">
                  ${escaparHTMLAbonos(movimiento.tipo || "-")}
                </span>
              </td>
              <td>${escaparHTMLAbonos(movimiento.detalle || "-")}</td>
              <td>${escaparHTMLAbonos(movimiento.referencia || "-")}</td>
              <td class="text-end text-danger">${numeroAbonos(movimiento.debe) ? formatearCLPAbonos(movimiento.debe) : "-"}</td>
              <td class="text-end text-success">${numeroAbonos(movimiento.haber) ? formatearCLPAbonos(movimiento.haber) : "-"}</td>
              <td class="text-end fw-semibold">${formatearCLPAbonos(movimiento.saldo)}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="7" class="text-center text-muted py-4">Sin movimientos.</td></tr>`;
    } catch (error) {
      elementos.cartolaColaborador.textContent = "No fue posible cargar la cartola";
      elementos.tablaCartola.innerHTML = `
        <tr><td colspan="7" class="text-center text-danger py-4">${escaparHTMLAbonos(error.message)}</td></tr>
      `;
    }
  }

  function prepararAnulacion(idAbono) {
    const abono = estado.abonos.find((item) => item.id_abono === idAbono);

    if (!abono) {
      return;
    }

    estado.idAbonoAnular = idAbono;
    elementos.motivoAnulacion.value = "";
    elementos.detalleAnular.textContent =
      `${abono.colaborador} · ${formatearCLPAbonos(abono.monto)} · ${idAbono}`;
    modalAnular.show();
  }

  async function confirmarAnulacion(evento) {
    evento.preventDefault();
    const motivo = elementos.motivoAnulacion.value.trim();

    if (!motivo) {
      elementos.motivoAnulacion.classList.add("is-invalid");
      return;
    }

    elementos.motivoAnulacion.classList.remove("is-invalid");
    elementos.btnConfirmarAnulacion.disabled = true;

    try {
      const respuesta = await anularAbonoGoogleSheets(
        estado.idAbonoAnular,
        motivo
      );
      modalAnular.hide();
      mostrarAlerta(respuesta.mensaje || "Abono anulado correctamente.", "success");
      await cargarAbonos();
    } catch (error) {
      mostrarAlerta(error.message || "No fue posible anular el abono.", "danger");
    } finally {
      elementos.btnConfirmarAnulacion.disabled = false;
    }
  }

  function mostrarAlerta(mensaje, tipo) {
    elementos.alerta.className = `alert alert-${tipo}`;
    elementos.alerta.textContent = mensaje;
    elementos.alerta.classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function ocultarAlerta() {
    elementos.alerta.classList.add("d-none");
  }

  function mostrarErrorTabla(mensaje) {
    elementos.tabla.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger py-4">
          ${escaparHTMLAbonos(mensaje || "No fue posible cargar los abonos.")}
        </td>
      </tr>
    `;
  }
});


function numeroAbonos(valor) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
}


function formatearCLPAbonos(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(numeroAbonos(valor));
}


function convertirFechaAbonos(valor) {
  if (!valor) {
    return null;
  }

  const texto = String(valor).trim();
  let coincidencia = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (coincidencia) {
    return new Date(
      Number(coincidencia[1]),
      Number(coincidencia[2]) - 1,
      Number(coincidencia[3])
    );
  }

  coincidencia = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

  if (coincidencia) {
    return new Date(
      Number(coincidencia[3]),
      Number(coincidencia[2]) - 1,
      Number(coincidencia[1])
    );
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}


function formatearFechaAbonos(valor) {
  const fecha = convertirFechaAbonos(valor);

  if (!fecha) {
    return String(valor || "-");
  }

  return fecha.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}


function obtenerFechaLocalISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}


function normalizarRutAbonos(valor) {
  return String(valor || "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .replace(/\s/g, "")
    .toUpperCase();
}


function escaparHTMLAbonos(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
