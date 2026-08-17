document.addEventListener("DOMContentLoaded", async () => {
  console.log("colaboradores.js iniciado");

  const tabla = document.getElementById("tablaColaboradores");
  const buscador = document.getElementById("buscarColaborador");
  const totalColaboradores = document.getElementById("totalColaboradoresModulo");
  const totalAsignado = document.getElementById("totalAsignadoColaboradores");
  const totalRendido = document.getElementById("totalRendidoColaboradores");
  const totalPorRendir = document.getElementById("totalPorRendirColaboradores");
  const totalFavor = document.getElementById("totalFavorColaboradores");

  if (
    !tabla ||
    !buscador ||
    !totalColaboradores ||
    !totalAsignado ||
    !totalRendido ||
    !totalPorRendir ||
    !totalFavor
  ) {
    console.error("No se encontraron los elementos del módulo Colaboradores.");
    return;
  }

  tabla.innerHTML = `
    <tr>
      <td colspan="8" class="text-center text-muted py-4">
        <div class="spinner-border spinner-border-sm me-2" role="status"></div>
        Cargando colaboradores...
      </td>
    </tr>
  `;

  try {
    const colaboradores = await solicitarAppsScript({
      colaboradores: "1"
    });

    if (!Array.isArray(colaboradores)) {
      throw new Error("Apps Script no devolvió un listado válido de colaboradores.");
    }

    const colaboradoresOrdenados = colaboradores
      .slice()
      .sort((a, b) =>
        String(a.colaborador || "").localeCompare(
          String(b.colaborador || ""),
          "es",
          { sensitivity: "base" }
        )
      );

    actualizarResumen(colaboradoresOrdenados);
    renderizarColaboradores(colaboradoresOrdenados);

    buscador.addEventListener("input", () => {
      const texto = buscador.value.toLowerCase().trim();

      const filtrados = colaboradoresOrdenados.filter((colaborador) => {
        const campos = [
          colaborador.rut,
          colaborador.colaborador,
          colaborador.empresa,
          colaborador.centro_costo,
          colaborador.correo,
          colaborador.ultima_rendicion_id
        ];

        return campos.some((campo) =>
          String(campo || "").toLowerCase().includes(texto)
        );
      });

      renderizarColaboradores(filtrados);
    });

  } catch (error) {
    console.error("Error cargando colaboradores:", error);

    tabla.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger py-4">
          ${escaparHTMLColaboradores(
            error.message || "No fue posible cargar los colaboradores."
          )}
        </td>
      </tr>
    `;

    totalColaboradores.textContent = "Error";
    totalAsignado.textContent = "Error";
    totalRendido.textContent = "Error";
    totalPorRendir.textContent = "Error";
    totalFavor.textContent = "Error";
  }

  function actualizarResumen(lista) {
    const resumen = lista.reduce(
      (acumulado, colaborador) => {
        const asignado = numeroColaboradores(colaborador.monto_asignado);
        const rendido = numeroColaboradores(colaborador.monto_rendido);
        const saldo = numeroColaboradores(colaborador.saldo);

        acumulado.asignado += asignado;
        acumulado.rendido += rendido;

        if (saldo > 0) {
          acumulado.porRendir += saldo;
        }

        if (saldo < 0) {
          acumulado.aFavor += Math.abs(saldo);
        }

        return acumulado;
      },
      {
        asignado: 0,
        rendido: 0,
        porRendir: 0,
        aFavor: 0
      }
    );

    totalColaboradores.textContent = lista.length;
    totalAsignado.textContent = formatearCLPColaboradores(resumen.asignado);
    totalRendido.textContent = formatearCLPColaboradores(resumen.rendido);
    totalPorRendir.textContent = formatearCLPColaboradores(resumen.porRendir);
    totalFavor.textContent = formatearCLPColaboradores(resumen.aFavor);
  }

  function renderizarColaboradores(lista) {
    if (!lista.length) {
      tabla.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-4">
            No se encontraron colaboradores.
          </td>
        </tr>
      `;
      return;
    }

    tabla.innerHTML = lista
      .map((colaborador) => {
        const ultimaRendicionId = String(
          colaborador.ultima_rendicion_id || ""
        ).trim();

        return `
          <tr>
            <td>
              <strong>${escaparHTMLColaboradores(colaborador.colaborador || "-")}</strong>
              <div class="small text-muted">
                ${escaparHTMLColaboradores(colaborador.correo || "Sin correo")}
              </div>
            </td>

            <td>${escaparHTMLColaboradores(colaborador.empresa || "-")}</td>
            <td>${escaparHTMLColaboradores(colaborador.centro_costo || "-")}</td>

            <td class="text-end">
              ${formatearCLPColaboradores(colaborador.monto_asignado)}
            </td>

            <td class="text-end">
              ${formatearCLPColaboradores(colaborador.monto_rendido)}
            </td>

            <td class="text-end">
              ${crearSaldoColaborador(colaborador.saldo)}
            </td>

            <td class="text-center">
              <div>${Number(colaborador.cantidad_rendiciones) || 0}</div>
              <div class="small text-muted">
                ${escaparHTMLColaboradores(
                  formatearFechaColaboradores(colaborador.ultima_rendicion_en)
                )}
              </div>
            </td>

            <td class="text-center">
              ${
                ultimaRendicionId
                  ? `
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary btn-ultima-rendicion"
                      data-id="${escaparHTMLColaboradores(ultimaRendicionId)}"
                      title="Abrir ${escaparHTMLColaboradores(ultimaRendicionId)}"
                    >
                      <i class="bi bi-eye"></i>
                      ${escaparHTMLColaboradores(ultimaRendicionId)}
                    </button>
                  `
                  : `<span class="text-muted">Sin rendiciones</span>`
              }
            </td>
          </tr>
        `;
      })
      .join("");

    tabla
      .querySelectorAll(".btn-ultima-rendicion")
      .forEach((boton) => {
        boton.addEventListener("click", () => {
          const id = boton.dataset.id;

          if (id) {
            window.location.href =
              `detalle-rendicion.html?id=${encodeURIComponent(id)}`;
          }
        });
      });
  }
});


function numeroColaboradores(valor) {
  const numero = Number(valor || 0);
  return Number.isFinite(numero) ? numero : 0;
}


function formatearCLPColaboradores(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(numeroColaboradores(valor));
}


function crearSaldoColaborador(valor) {
  const saldo = numeroColaboradores(valor);

  if (saldo < 0) {
    return `
      <span class="badge bg-info text-dark">
        A favor ${formatearCLPColaboradores(Math.abs(saldo))}
      </span>
    `;
  }

  if (saldo > 0) {
    return `
      <span class="badge bg-warning text-dark">
        Por rendir ${formatearCLPColaboradores(saldo)}
      </span>
    `;
  }

  return `
    <span class="badge bg-success">
      Sin saldo
    </span>
  `;
}


function formatearFechaColaboradores(valor) {
  if (!valor) {
    return "Sin rendiciones";
  }

  const texto = String(valor).trim();

  const fechaISO = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (fechaISO) {
    return `${fechaISO[3]}-${fechaISO[2]}-${fechaISO[1]}`;
  }

  const fechaChilena = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

  if (fechaChilena) {
    return `${fechaChilena[1].padStart(2, "0")}-${fechaChilena[2].padStart(2, "0")}-${fechaChilena[3]}`;
  }

  return texto;
}


function escaparHTMLColaboradores(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
