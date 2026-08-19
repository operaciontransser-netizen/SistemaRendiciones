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
    tabla.innerHTML = `<tr><td colspan="8" class="text-center ${clase}">${escaparHTML(mensaje)}</td></tr>`;
  }

  tabla.innerHTML = `
    <tr><td colspan="8" class="text-center text-muted">
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

  try {
    if (esSuperAdmin && selectorEmpresa && contenedorEmpresa) {
      const empresas = await solicitarAppsScript({ empresas: "1" });
      if (!Array.isArray(empresas)) throw new Error("No fue posible obtener las empresas.");

      selectorEmpresa.innerHTML = `
        <option value="">Todas las empresas</option>
        ${empresas.map((empresa) => {
          const codigo = String(empresa.codigo_empresa || "").trim();
          const nombre = String(empresa.nombre_empresa || codigo || "Empresa").trim();
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

    const rendiciones = await solicitarAppsScript(empresaActiva ? { empresa: empresaActiva } : {});
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
        return `
          <tr>
            <td><strong>${escaparHTML(id || "-")}</strong></td>
            <td>${escaparHTML(formatearFecha(rendicion.procesado_en))}</td>
            <td>${escaparHTML(rendicion.colaborador || "-")}</td>
            <td>${escaparHTML(rendicion.empresa || "-")}</td>
            <td>${escaparHTML(rendicion.numero_viaje || "-")}</td>
            <td>${Number(rendicion.cantidad_documentos) || 0}</td>
            <td>${crearBadgeEstado(rendicion)}</td>
            <td class="text-center">
              <button type="button" class="btn btn-sm btn-primary btn-ver-rendicion" data-id="${escaparHTML(id)}">
                <i class="bi bi-eye"></i> Ver
              </button>
            </td>
          </tr>`;
      }).join("");

      tabla.querySelectorAll(".btn-ver-rendicion").forEach((boton) => {
        boton.addEventListener("click", () => verRendicion(boton.dataset.id));
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

function escaparHTML(valor) {
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
