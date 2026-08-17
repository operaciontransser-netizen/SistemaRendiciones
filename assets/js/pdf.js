function generarPDF() {
  const folio =
    document.getElementById("detalleFolio")?.textContent.trim() || "-";

  const colaborador =
    document.getElementById("detalleColaborador")?.textContent.trim() || "-";

  const viaje =
    document.getElementById("detalleViaje")?.textContent.trim() || "-";

  const totalTexto =
    document.getElementById("totalRendicion")?.textContent.trim() || "$0";

  const tabla = document.getElementById("tablaDocumentos");

  if (!tabla) {
    alert("No se encontró la tabla de documentos.");
    return;
  }

  const detalle = window.detalleRendicionActual;

  if (!detalle) {
    alert("Todavía no están cargados los datos completos de la rendición.");
    return;
  }

  const empresa = detalle.empresa || "TRANSSER";
  const centroCosto = detalle.centro_costo || "-";
  const rut = detalle.rut || "-";

  const estadoRendicion = String(
    detalle.estado_rendicion || "PENDIENTE"
  )
    .trim()
    .toUpperCase();

  const estaAutorizada =
    estadoRendicion === "AUTORIZADA";

  const autorizadoNombre =
    detalle.autorizado_nombre || "-";

  const autorizadoPor =
    detalle.autorizado_por || "-";

  const autorizadoEn =
    formatearFechaHoraPDF(
      detalle.autorizado_en
    );

  const montoAsignado = Number(detalle.monto_asignado || 0);

  // En Google Sheets la columna se llama SALDO 2.
  // En el sistema lo tratamos simplemente como saldo.
  const saldo = Number(detalle.saldo_2 || 0);

  // Regla:
  // saldo positivo = saldo a favor empresa
  // saldo negativo = saldo a favor trabajador
  const saldoEmpresa = saldo > 0 ? saldo : 0;
  const saldoTrabajador = saldo < 0 ? Math.abs(saldo) : 0;

  const totalNumerico = convertirMontoPDF(totalTexto);

  const filasDocumentos = Array.from(
    tabla.querySelectorAll("tr")
  )
    .map((fila) => {
      const celdas = fila.querySelectorAll("td");

      if (celdas.length < 6) return "";

      const fecha = formatearFechaPDF(
        celdas[0].textContent.trim()
      );

      const numeroDocumento =
        celdas[1].textContent.trim() || "-";

      const descripcion =
        celdas[4].textContent.trim() || "-";

      const monto =
        celdas[5].textContent.trim() || "$0";

      return `
        <tr>
          <td>${fecha}</td>
          <td>${numeroDocumento}</td>
          <td>${descripcion}</td>
          <td class="monto">${monto}</td>
        </tr>
      `;
    })
    .join("");

  const logoURL = new URL(
    "../assets/img/logo.png",
    window.location.href
  ).href;

  const ventana = window.open("", "_blank");

  if (!ventana) {
    alert("El navegador bloqueó la ventana de impresión.");
    return;
  }

  ventana.document.write(`
    <!DOCTYPE html>
    <html lang="es">

    <head>
      <meta charset="UTF-8">

      <title>Rendición ${folio}</title>

      <style>

        /* =====================================
           CONFIGURACIÓN A4
        ===================================== */

        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
        }

        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #111111;
          font-size: 12px;
          line-height: 1.35;
        }

        .pagina {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          padding: 0;
        }


        /* =====================================
           TÍTULO
        ===================================== */

        .titulo-principal {
          font-size: 21px;
          font-weight: 700;
          margin-bottom: 12px;
          letter-spacing: 0.2px;
        }


        /* =====================================
           CABECERA
        ===================================== */

        .cabecera {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
        }

        .cabecera > tbody > tr > td {
          border: 1px solid #333333;
          vertical-align: middle;
        }


        /* =====================================
           LOGO
        ===================================== */

        .logo-cell {
          width: 42%;
          height: 118px;
          text-align: center;
          vertical-align: middle;
          padding: 4px !important;
        }

        .logo-cell img {
          display: block;

          width: 96%;
          height: 108px;

          margin: 0 auto;

          object-fit: contain;
          object-position: center;
        }


        /* =====================================
           DATOS CABECERA
        ===================================== */

        .datos-cell {
          width: 58%;
          padding: 0 !important;
        }

        .datos-internos {
          width: 100%;
          border-collapse: collapse;
        }

        .datos-internos td {
          padding: 6px 9px;
          border: none;
          border-bottom: 1px solid #555555;
          font-size: 11px;
        }

        .datos-internos tr:last-child td {
          border-bottom: none;
        }

        .datos-internos .label {
          width: 42%;
          font-weight: bold;
          background: #f7f7f7;
        }


        /* =====================================
           DATOS DEL COLABORADOR
        ===================================== */

        .nombre {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
        }

        .nombre td {
          border: 1px solid #333333;
          padding: 8px 10px;
          font-size: 11px;
        }


        /* =====================================
           MONTO ASIGNADO / VIAJE
        ===================================== */

        .resumen-superior {
          width: 68%;
          margin-left: auto;
          margin-bottom: 15px;
          border-collapse: collapse;
        }

        .resumen-superior th,
        .resumen-superior td {
          border: 1px solid #333333;
          padding: 7px 9px;
          font-size: 11px;
        }

        .resumen-superior th {
          background: #f5f5f5;
          text-align: center;
          font-weight: bold;
        }


        /* =====================================
           TABLA DE DOCUMENTOS
        ===================================== */

        .detalle {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-top: 6px;
          margin-bottom: 16px;
        }

        .detalle thead {
          display: table-header-group;
        }

        .detalle tr {
          page-break-inside: avoid;
        }

        .detalle th,
        .detalle td {
          border: 1px solid #333333;
          padding: 6px 7px;
          vertical-align: middle;
          overflow-wrap: anywhere;
        }

        .detalle th {
          background: #f2f2f2;
          font-weight: bold;
          text-align: center;
          font-size: 10px;
        }

        .detalle td {
          font-size: 10px;
        }

        .detalle th:nth-child(1),
        .detalle td:nth-child(1) {
          width: 15%;
        }

        .detalle th:nth-child(2),
        .detalle td:nth-child(2) {
          width: 20%;
        }

        .detalle th:nth-child(3),
        .detalle td:nth-child(3) {
          width: 48%;
        }

        .detalle th:nth-child(4),
        .detalle td:nth-child(4) {
          width: 17%;
        }

        .monto {
          text-align: right;
          white-space: nowrap;
        }


        /* =====================================
           ZONA INFERIOR
        ===================================== */

        .zona-inferior {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          margin-top: 18px;
        }

        .deposito {
          width: 40%;
          min-height: 115px;
          border: 1px solid #333333;
          padding: 10px 11px;
          line-height: 1.7;
          font-size: 10px;
        }

        .deposito-titulo {
          font-weight: bold;
          margin-bottom: 4px;
          font-size: 11px;
        }


        /* =====================================
           TOTALES
        ===================================== */

        .totales {
          width: 50%;
          border-collapse: collapse;
        }

        .totales td {
          border: 1px solid #333333;
          padding: 7px 9px;
          font-size: 10px;
        }

        .totales td:first-child {
          width: 68%;
        }

        .totales td:last-child {
          width: 32%;
          text-align: right;
          white-space: nowrap;
        }

        .total-destacado {
          font-weight: bold;
        }

        .saldo-trabajador td {
          background: #fff3a0;
          font-weight: bold;
        }


        /* =====================================
           AUTORIZACIÓN DIGITAL
        ===================================== */

        .autorizacion {
          margin-top: 20px;
          border: 1px solid #198754;
          page-break-inside: avoid;
        }

        .autorizacion-titulo {
          padding: 7px 10px;
          background: #198754;
          color: #ffffff;
          font-size: 11px;
          font-weight: bold;
        }

        .autorizacion-contenido {
          width: 100%;
          border-collapse: collapse;
        }

        .autorizacion-contenido td {
          width: 50%;
          padding: 8px 10px;
          border: none;
          border-top: 1px solid #b7ddc9;
          vertical-align: top;
          font-size: 10px;
        }

        .autorizacion-label {
          display: block;
          margin-bottom: 3px;
          color: #555555;
          font-size: 9px;
        }

        .autorizacion-valor {
          font-weight: bold;
        }

        .autorizacion.pendiente {
          border-color: #d39e00;
        }

        .autorizacion.pendiente .autorizacion-titulo {
          background: #ffc107;
          color: #111111;
        }

        .autorizacion-pendiente-texto {
          padding: 12px 10px;
          font-size: 10px;
          font-weight: bold;
          text-align: center;
        }


        /* =====================================
           FIRMAS
        ===================================== */

        .firmas {
          width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 60px;
          margin-top: 60px;
        }

        .firma-bloque {
          width: 43%;
          min-height: 90px;
        }

        .firma-label {
          margin-bottom: 38px;
          font-size: 10px;
        }

        .linea-firma {
          border-top: 1px solid #222222;
          text-align: center;
          padding-top: 6px;
          font-size: 9px;
        }


        /* =====================================
           PIE
        ===================================== */

        .pie {
          margin-top: 32px;
          padding-top: 8px;
          border-top: 1px solid #dddddd;
          color: #777777;
          font-size: 8px;
          text-align: center;
        }


        /* =====================================
           IMPRESIÓN
        ===================================== */

        @media print {

          html,
          body {
            width: 100%;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .pagina {
            width: 100%;
            max-width: none;
          }

        }

      </style>
    </head>


    <body>

      <div class="pagina">

        <div class="titulo-principal">
          RENDICIÓN DE GASTOS
        </div>


        <!-- CABECERA -->

        <table class="cabecera">

          <tr>

            <td class="logo-cell">

              <img
                src="${logoURL}"
                alt="Logo TRANSSER"
              >

            </td>


            <td class="datos-cell">

              <table class="datos-internos">

                <tr>
                  <td class="label">
                    EMPRESA:
                  </td>

                  <td>
                    ${empresa}
                  </td>
                </tr>


                <tr>
                  <td class="label">
                    UNIDAD DE NEGOCIO:
                  </td>

                  <td>
                    -
                  </td>
                </tr>


                <tr>
                  <td class="label">
                    FOLIO:
                  </td>

                  <td>
                    ${folio}
                  </td>
                </tr>


                <tr>
                  <td class="label">
                    CENTRO DE COSTOS:
                  </td>

                  <td>
                    ${centroCosto}
                  </td>
                </tr>


                <tr>
                  <td class="label">
                    RUT:
                  </td>

                  <td>
                    ${rut}
                  </td>
                </tr>

              </table>

            </td>

          </tr>

        </table>


        <!-- NOMBRE -->

        <table class="nombre">

          <tr>
            <td>
              <strong>NOMBRE:</strong>
              &nbsp;&nbsp;
              ${colaborador}
            </td>
          </tr>

        </table>


        <!-- MONTO / VIAJE -->

        <table class="resumen-superior">

          <tr>

            <th>
              MONTO ASIGNADO
            </th>

            <th>
              VIAJE / RUTA
            </th>

          </tr>


          <tr>

            <td class="monto">
              ${formatearDineroPDF(montoAsignado)}
            </td>

            <td>
              ${viaje}
            </td>

          </tr>


          <tr>

            <td>
              <strong>
                TOTAL A RENDIR
              </strong>
            </td>

            <td class="monto">

              <strong>
                ${formatearDineroPDF(totalNumerico)}
              </strong>

            </td>

          </tr>

        </table>


        <!-- DETALLE -->

        <table class="detalle">

          <thead>

            <tr>
              <th>FECHA</th>
              <th>N° DOCUMENTO</th>
              <th>TIPO DE GASTO</th>
              <th>MONTO</th>
            </tr>

          </thead>


          <tbody>

            ${filasDocumentos}

          </tbody>

        </table>


        <!-- ZONA INFERIOR -->

        <div class="zona-inferior">


          <div class="deposito">

            <div class="deposito-titulo">
              DEPÓSITO
            </div>

            - Banco:<br>
            - Cuenta Corriente:<br>
            - RUT:<br>
            - Mail:

          </div>


          <table class="totales">

            <tr>

              <td>
                TOTAL GASTOS (+)
              </td>

              <td>
                ${formatearDineroPDF(totalNumerico)}
              </td>

            </tr>


            <tr class="total-destacado">

              <td>
                TOTAL A RENDIR
              </td>

              <td>
                ${formatearDineroPDF(totalNumerico)}
              </td>

            </tr>


            <tr>

              <td>
                SALDO A FAVOR EMPRESA
              </td>

              <td>
                ${formatearDineroPDF(saldoEmpresa)}
              </td>

            </tr>


            <tr class="${saldoTrabajador > 0 ? "saldo-trabajador" : ""}">

              <td>
                SALDO A FAVOR TRABAJADOR
              </td>

              <td>
                ${formatearDineroPDF(saldoTrabajador)}
              </td>

            </tr>

          </table>

        </div>


        <!-- AUTORIZACIÓN DIGITAL -->

        ${
          estaAutorizada
            ? `
              <div class="autorizacion">

                <div class="autorizacion-titulo">
                  RENDICIÓN AUTORIZADA
                </div>

                <table class="autorizacion-contenido">

                  <tr>

                    <td>
                      <span class="autorizacion-label">
                        AUTORIZADA POR
                      </span>

                      <span class="autorizacion-valor">
                        ${autorizadoNombre}
                      </span>
                    </td>

                    <td>
                      <span class="autorizacion-label">
                        FECHA Y HORA
                      </span>

                      <span class="autorizacion-valor">
                        ${autorizadoEn}
                      </span>
                    </td>

                  </tr>

                  <tr>

                    <td>
                      <span class="autorizacion-label">
                        CORREO DEL JEFE DE ÁREA
                      </span>

                      <span class="autorizacion-valor">
                        ${autorizadoPor}
                      </span>
                    </td>

                    <td>
                      <span class="autorizacion-label">
                        CARGO
                      </span>

                      <span class="autorizacion-valor">
                        Jefe de Área
                      </span>
                    </td>

                  </tr>

                </table>

              </div>
            `
            : `
              <div class="autorizacion pendiente">

                <div class="autorizacion-titulo">
                  ESTADO DE AUTORIZACIÓN
                </div>

                <div class="autorizacion-pendiente-texto">
                  PENDIENTE DE AUTORIZACIÓN DEL JEFE DE ÁREA
                </div>

              </div>
            `
        }


        <!-- FIRMAS -->

        <div class="firmas">

          <div class="firma-bloque">

            <div class="firma-label">
              Firma:
            </div>

            <div class="linea-firma">
              Quien rinde
            </div>

          </div>


          <div class="firma-bloque">

            <div class="firma-label">
              &nbsp;
            </div>

            <div class="linea-firma">
              V°B° Tesorería
            </div>

          </div>

        </div>


        <div class="pie">
          Documento generado por Sistema de Rendiciones
        </div>

      </div>

    </body>

    </html>
  `);

  ventana.document.close();

  setTimeout(() => {
    ventana.focus();
    ventana.print();
  }, 1000);
}


function convertirMontoPDF(valor) {
  if (!valor) return 0;

  const limpio = String(valor)
    .replace(/\$/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");

  return Number(limpio) || 0;
}


function formatearDineroPDF(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Number(valor) || 0);
}


function formatearFechaPDF(fecha) {
  if (!fecha || fecha === "-") {
    return "-";
  }

  if (
    fecha.includes("-00") ||
    fecha.endsWith("-00")
  ) {
    return "REVISAR FECHA";
  }

  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function formatearFechaHoraPDF(valor) {
  if (!valor) {
    return "-";
  }

  const texto =
    String(valor).trim();

  const fecha =
    new Date(texto);

  if (
    !Number.isNaN(
      fecha.getTime()
    )
  ) {
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

  return texto;
}
