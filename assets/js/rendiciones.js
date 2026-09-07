document.addEventListener("DOMContentLoaded", async () => {
  console.log("rendiciones.js iniciado");

  const tabla = document.getElementById("tablaRendiciones");
  const totalRendiciones = document.getElementById("totalRendiciones");
  const buscador = document.getElementById("buscarRendicion");
  const contenedorEmpresa = document.getElementById("contenedorSelectorEmpresaRendiciones");
  const selectorEmpresa = document.getElementById("selectorEmpresaRendiciones");

  if (!tabla || !totalRendiciones || !buscador) {
    console.error("No se encontraron elementos de la página Rendiciones.");
    return;
  }

  function mostrarMensaje(mensaje, clase = "text-muted") {
    tabla.innerHTML = `<tr><td colspan="10" class="text-center ${clase}">${escaparHTML(mensaje)}</td></tr>`;
  }

  tabla.innerHTML = `
    <tr><td colspan="10" class="text-center text-muted">
      <div class="spinner-border spinner-border-sm me-2" role="status"></div>
      Cargando rendiciones...
    </td></tr>`;

  const usuario = obtenerUsuarioActual();
  if (!usuario) {
    window.location.href = "login.html";
    return;
  }

  const rol = String(usuario.rol || "").trim().toUpperCase();
  const esSuperAdmin = rol === "SUPER ADMIN";
  let empresaActiva = "";
  let rendicionesIniciales = null;

  const tokenSeguro = sessionStorage.getItem("rendicionesTokenSeguro") || "";

  async function solicitarApiLocal(ruta) {
    const apiBase = new URL(window.location.origin);
    if (apiBase.port === "5500") apiBase.port = "3000";
    const respuesta = await fetch(`${apiBase.origin}${ruta}`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${tokenSeguro}` }
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.error || `Error API local: ${respuesta.status}`);
    return datos.data;
  }

  function convertirRendicionLocal(item) {
    const estadoOriginal = String(item.estado || "").trim().toUpperCase();
    const estado = ["PENDIENTE REVISION", "PRESENTADA", "PENDIENTE"].includes(estadoOriginal)
      ? "PENDIENTE"
      : estadoOriginal;
    return {
      ID: item.folio,
      procesado_en: item.fecha_presentacion,
      colaborador: item.colaborador,
      empresa: item.empresa_codigo,
      numero_viaje: item.numero_viaje || "-",
      centro_costo_codigo: item.centro_costo_codigo || "",
      centro_costo_nombre: item.centro_costo_nombre || "-",
      monto_total: Number(item.presentado || 0),
      cantidad_documentos: Number(item.comprobantes || 0),
      estado_rendicion: estado
    };
  }

  function claveTexto(valor) {
    return String(valor || "").trim().toUpperCase();
  }

  async function agregarCentrosCostoGoogleSheets(rendiciones) {
    const colaboradores = await solicitarAppsScriptConCache(
      { colaboradores: "1" },
      "colaboradores-centros-rendiciones",
      30000
    );
    if (!Array.isArray(colaboradores)) return rendiciones;

    const porRut = new Map();
    const porNombre = new Map();
    colaboradores.forEach((item) => {
      const centro = item.centro_costo || item.centro_costo_nombre || "";
      if (item.rut) porRut.set(claveTexto(item.rut).replace(/[^0-9K]/g, ""), centro);
      if (item.colaborador) porNombre.set(claveTexto(item.colaborador), centro);
    });

    return rendiciones.map((rendicion) => {
      const rut = claveTexto(rendicion.rut).replace(/[^0-9K]/g, "");
      const centro = rendicion.centro_costo_nombre || rendicion.centro_costo ||
        porRut.get(rut) || porNombre.get(claveTexto(rendicion.colaborador)) || "";
      return { ...rendicion, centro_costo: centro, centro_costo_nombre: centro };
    });
  }

  try {
    if (esSuperAdmin && selectorEmpresa && contenedorEmpresa) {
      // Las empresas y el listado son consultas independientes: se solicitan
      // en paralelo para reducir el tiempo de apertura del módulo.
      const [empresas, detalleGerencial] = tokenSeguro
        ? await Promise.all([
            solicitarApiLocal("/api/v1/empresas"),
            solicitarApiLocal("/api/v1/reports/management-detail")
          ])
        : await Promise.all([
            solicitarAppsScriptConCache({ empresas: "1" }, "empresas", 30000),
            solicitarAppsScriptConCache({}, "rendiciones", 15000)
          ]);
      rendicionesIniciales = tokenSeguro
        ? (Array.isArray(detalleGerencial?.renditions)
            ? detalleGerencial.renditions.map(convertirRendicionLocal)
            : [])
        : detalleGerencial;

      if (!Array.isArray(empresas)) throw new Error("No fue posible obtener las empresas.");
      if (!Array.isArray(rendicionesIniciales)) throw new Error("La API no devolvió un listado válido.");

      selectorEmpresa.innerHTML = `
        <option value="">Todas las empresas</option>
        ${empresas.map((empresa) => {
          const codigo = String(empresa.codigo_empresa || empresa.codigo || "").trim();
          const nombre = String(empresa.nombre_empresa || empresa.nombre || codigo || "Empresa").trim();
          return `<option value="${escaparHTML(codigo)}">${escaparHTML(nombre)}</option>`;
        }).join("")}`;

      const empresaGuardada = String(localStorage.getItem("empresaSeleccionada") || "").trim();
      const valoresValidos = Array.from(selectorEmpresa.options).map((opcion) => opcion.value);
      empresaActiva = valoresValidos.includes(empresaGuardada) ? empresaGuardada : "";
      selectorEmpresa.value = empresaActiva;
      contenedorEmpresa.classList.remove("d-none");

      selectorEmpresa.addEventListener("change", () => {
        if (selectorEmpresa.value) {
          localStorage.setItem("empresaSeleccionada", selectorEmpresa.value);
        } else {
          localStorage.removeItem("empresaSeleccionada");
        }
        window.location.reload();
      });
    } else {
      localStorage.removeItem("empresaSeleccionada");
    }

    if (tokenSeguro && !Array.isArray(rendicionesIniciales)) {
      const detalleGerencial = await solicitarApiLocal("/api/v1/reports/management-detail");
      rendicionesIniciales = Array.isArray(detalleGerencial?.renditions)
        ? detalleGerencial.renditions.map(convertirRendicionLocal)
        : [];
    }

    let rendiciones = tokenSeguro
      ? (empresaActiva
          ? rendicionesIniciales.filter((item) => item.empresa === empresaActiva)
          : rendicionesIniciales)
      : (esSuperAdmin && selectorEmpresa && contenedorEmpresa)
      ? (empresaActiva
          ? await solicitarAppsScriptConCache({ empresa: empresaActiva }, "rendiciones", 15000)
          : rendicionesIniciales)
      : await solicitarAppsScriptConCache(
          empresaActiva ? { empresa: empresaActiva } : {},
          "rendiciones",
          15000
        );
    if (!tokenSeguro) {
      rendiciones = await agregarCentrosCostoGoogleSheets(rendiciones);
    }

    console.log("Rendiciones recibidas:", rendiciones);
    if (!Array.isArray(rendiciones)) throw new Error("La API no devolvió un listado válido.");

    totalRendiciones.textContent = rendiciones.length;

    function obtenerTiempoProcesado(fecha) {
      if (!fecha) return Number.NEGATIVE_INFINITY;
      const texto = String(fecha).trim();
      const chilena = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (chilena) {
        return new Date(
          Number(chilena[3]), Number(chilena[2]) - 1, Number(chilena[1]),
          Number(chilena[4] || 0), Number(chilena[5] || 0), Number(chilena[6] || 0)
        ).getTime();
      }
      const tiempo = Date.parse(texto);
      return Number.isNaN(tiempo) ? Number.NEGATIVE_INFINITY : tiempo;
    }

    function ordenarPorFechaDescendente(lista) {
      return lista.map((rendicion, indiceOriginal) => ({
        rendicion, indiceOriginal, tiempo: obtenerTiempoProcesado(rendicion.procesado_en)
      })).sort((a, b) => a.tiempo !== b.tiempo
        ? b.tiempo - a.tiempo
        : a.indiceOriginal - b.indiceOriginal
      ).map((elemento) => elemento.rendicion);
    }

    function formatearFecha(fecha) {
      if (!fecha) return "-";
      const texto = String(fecha).trim();
      const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
      const chilena = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
      if (chilena) return `${chilena[1].padStart(2, "0")}-${chilena[2].padStart(2, "0")}-${chilena[3]}`;
      const objeto = new Date(texto);
      if (Number.isNaN(objeto.getTime())) return texto;
      return objeto.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
    }

    function obtenerEstadoRendicion(rendicion) {
      return String(rendicion.estado_rendicion || "PENDIENTE").trim().toUpperCase();
    }

    function crearBadgeEstado(rendicion) {
      const estados = {
        AUTORIZADA: ["bg-success", "Autorizada"],
        AUTORIZADA_PARCIAL: ["bg-primary", "Autorizada parcialmente"],
        RECHAZADA: ["bg-danger", "Rechazada"],
        PENDIENTE: ["bg-warning text-dark", "Pendiente"]
      };
      const configuracion = estados[obtenerEstadoRendicion(rendicion)] || estados.PENDIENTE;
      return `<span class="badge ${configuracion[0]}">${configuracion[1]}</span>`;
    }

    const rendicionesOrdenadas = ordenarPorFechaDescendente(rendiciones);

    function renderizar(lista) {
      if (!lista.length) {
        mostrarMensaje("No se encontraron rendiciones.");
        return;
      }

      tabla.innerHTML = lista.map((rendicion) => {
        const id = String(rendicion.ID || "").trim();
        
        // ADICIÓN 1: Crear botón de borrar condicional para Super Admin
        const botonBorrar = esSuperAdmin && !esModoSeguroRendiciones()
          ? `<button type="button" class="btn btn-sm btn-danger btn-borrar-rendicion ms-1" data-id="${escaparHTML(id)}">
               <i class="bi bi-trash"></i> Borrar
             </button>`
          : "";

        return `
          <tr>
            <td><strong>${escaparHTML(id || "-")}</strong></td>
            <td>${escaparHTML(formatearFecha(rendicion.procesado_en))}</td>
            <td>${escaparHTML(rendicion.colaborador || "-")}</td>
            <td>${escaparHTML(rendicion.empresa || "-")}</td>
            <td>${escaparHTML(rendicion.numero_viaje || "-")}</td>
            <td>${escaparHTML(rendicion.centro_costo_nombre || rendicion.centro_costo || rendicion.centro_costo_codigo || "-")}</td>
            <td>${formatearMonto(rendicion.monto_total)}</td>
            <td>${Number(rendicion.cantidad_documentos) || 0}</td>
            <td>${crearBadgeEstado(rendicion)}</td>
            <td class="text-center">
              <button type="button" class="btn btn-sm btn-primary btn-ver-rendicion" data-id="${escaparHTML(id)}">
                <i class="bi bi-eye"></i> Ver
              </button>
              ${botonBorrar}
            </td>
          </tr>`;
      }).join("");

      tabla.querySelectorAll(".btn-ver-rendicion").forEach((boton) => {
        boton.addEventListener("click", () => verRendicion(boton.dataset.id));
      });

      // ADICIÓN 2: Escuchar el evento click en los nuevos botones de borrar
      tabla.querySelectorAll(".btn-borrar-rendicion").forEach((boton) => {
        boton.addEventListener("click", () => eliminarRendicion(boton.dataset.id));
      });
    }

    renderizar(rendicionesOrdenadas);

    buscador.addEventListener("input", () => {
      const texto = buscador.value.toLowerCase().trim();
      const filtradas = rendicionesOrdenadas.filter((rendicion) => [
        rendicion.ID,
        rendicion.colaborador,
        rendicion.empresa,
        rendicion.numero_viaje,
        rendicion.centro_costo_nombre,
        rendicion.centro_costo,
        rendicion.centro_costo_codigo,
        rendicion.monto_total,
        formatearFecha(rendicion.procesado_en),
        obtenerEstadoRendicion(rendicion)
      ].some((campo) => String(campo || "").toLowerCase().includes(texto)));
      renderizar(filtradas);
    });
  } catch (error) {
    console.error("Error cargando rendiciones:", error);
    totalRendiciones.textContent = "Error";
    mostrarMensaje(error.message || "Error al cargar las rendiciones.", "text-danger");
  }
});

function verRendicion(id) {
  if (!id) return;
  window.location.href = `detalle-rendicion.html?id=${encodeURIComponent(id)}`;
}

// ADICIÓN 3: Nueva función para enviar la orden de borrado a Apps Script
async function eliminarRendicion(id) {
  if (!id) return;
  if (esModoSeguroRendiciones()) {
    alert("La anulación local está pendiente de migración. No se enviará ninguna orden a Google Sheets.");
    return;
  }

  const confirmar = confirm(`¿Estás seguro de que deseas eliminar la rendición con ID: ${id}? Esta acción no se puede deshacer.`);
  if (!confirmar) return;

  try {
    const respuesta = await solicitarAppsScript({ accion: "eliminarRendicion", id: id });
    
    if (respuesta && respuesta.success) {
      alert("Rendición eliminada exitosamente.");
      window.location.reload();
    } else {
      throw new Error(respuesta.error || "No se pudo eliminar la rendición.");
    }
  } catch (error) {
    console.error("Error al eliminar la rendición:", error);
    alert(`Error: ${error.message}`);
  }
}

function formatearMonto(valor) {
  const monto = Number(valor || 0);
  if (!Number.isFinite(monto)) return "$0";
  return monto.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function escaparHTML(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "'");
}
