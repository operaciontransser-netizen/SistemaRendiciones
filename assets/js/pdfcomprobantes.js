// ==========================================================
// PDF COMPLETO DE RENDICIÓN + RESPALDOS FOTOGRÁFICOS
// ==========================================================

async function generarPDFCompleto() {
  const detalle = window.detalleRendicionActual;

  if (!detalle || !Array.isArray(detalle.documentos)) {
    alert("Todavía no están cargados los datos de la rendición.");
    return;
  }

  const boton = document.getElementById("btnGenerarPDFCompleto");

  const textoOriginal = boton
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
        Preparando fotografías...
      `;
    }

    const folio =
      detalle.ID ||
      document.getElementById("detalleFolio")?.textContent.trim() ||
      "-";

    const colaborador =
      detalle.colaborador ||
      document.getElementById("detalleColaborador")?.textContent.trim() ||
      "-";

    const rut =
      detalle.rut ||
      "-";

    const empresa =
      detalle.empresa ||
      "TRANSSER";

    const centroCosto =
      detalle.centro_costo ||
      "-";

    const viaje =
      detalle.numero_viaje ||
      document.getElementById("detalleViaje")?.textContent.trim() ||
      "-";

    const estadoRendicion = String(
      detalle.estado_rendicion ||
      "PENDIENTE"
    )
      .trim()
      .toUpperCase();

    const revisionFinalizada = [
      "AUTORIZADA",
      "AUTORIZADA_PARCIAL",
      "RECHAZADA"
    ].includes(estadoRendicion);

    const autorizadoNombre =
      detalle.autorizado_nombre ||
      "-";

    const autorizadoPor =
      detalle.autorizado_por ||
      "-";

    const autorizadoEn =
      formatearFechaHoraComprobantes(
        detalle.autorizado_en
      );

    const montoAsignado =
      Number(detalle.monto_asignado || 0);

    const saldo =
      Number(detalle.saldo_2 || 0);

    const saldoEmpresa =
      saldo > 0
        ? saldo
        : 0;

    const saldoTrabajador =
      saldo < 0
        ? Math.abs(saldo)
        : 0;

    const documentos =
      detalle.documentos || [];

    const totalPresentado =
      documentos.reduce(
        (acumulado, documento) =>
          acumulado +
          convertirMontoComprobantes(
            documento.monto_total
          ),
        0
      );

    const obtenerEstadoDocumento = (documento) => {
      const estadoExplicito = String(
        documento.estado_comprobante || ""
      ).trim().toUpperCase();

      if (["AUTORIZADO", "RECHAZADO", "PENDIENTE"].includes(estadoExplicito)) {
        return estadoExplicito;
      }

      // Compatibilidad con rendiciones históricas.
      if (estadoRendicion === "AUTORIZADA") return "AUTORIZADO";
      if (estadoRendicion === "RECHAZADA") return "RECHAZADO";
      return "PENDIENTE";
    };

    const totalAutorizado = documentos
      .filter((documento) => obtenerEstadoDocumento(documento) === "AUTORIZADO")
      .reduce(
        (acumulado, documento) =>
          acumulado + convertirMontoComprobantes(documento.monto_total),
        0
      );

    const totalRechazado = documentos
      .filter((documento) => obtenerEstadoDocumento(documento) === "RECHAZADO")
      .reduce(
        (acumulado, documento) =>
          acumulado + convertirMontoComprobantes(documento.monto_total),
        0
      );

    const totalPendiente = documentos
      .filter((documento) => obtenerEstadoDocumento(documento) === "PENDIENTE")
      .reduce(
        (acumulado, documento) =>
          acumulado + convertirMontoComprobantes(documento.monto_total),
        0
      );

    // ------------------------------------------------------
    // BUSCAR URL DEL WEB APP DE APPS SCRIPT
    // ------------------------------------------------------

    const appsScriptURL =
      obtenerURLAppsScriptPDF();

    if (!appsScriptURL) {
      throw new Error(
        "No fue posible identificar la URL del Apps Script."
      );
    }

    // ------------------------------------------------------
    // DESCARGAR FOTOGRAFÍAS DESDE APPS SCRIPT
    // ------------------------------------------------------

    const documentosConFoto = [];

    for (
      let i = 0;
      i < documentos.length;
      i++
    ) {
      const documento =
        documentos[i];

      const urlFotografia =
        documento.fotografia ||
        documento.FOTOGRAFIA ||
        "";

      let fotoBase64 = "";
      let errorFoto = "";

      if (urlFotografia) {
        try {
          const idArchivo =
            extraerIdDrivePDF(
              urlFotografia
            );

          if (idArchivo) {
            const respuesta =
              await fetch(
                `${appsScriptURL}?foto=${encodeURIComponent(
                  idArchivo
                )}`
              );

            if (!respuesta.ok) {
              throw new Error(
                `HTTP ${respuesta.status}`
              );
            }

            const datosFoto =
              await respuesta.json();

            if (datosFoto.dataUrl) {
              fotoBase64 =
                datosFoto.dataUrl;
            } else {
              errorFoto =
                datosFoto.error ||
                "No fue posible cargar la fotografía.";
            }
          } else {
            errorFoto =
              "No fue posible identificar el archivo de Drive.";
          }
        } catch (error) {
          console.error(
            "Error cargando fotografía:",
            error
          );

          errorFoto =
            "No fue posible cargar la fotografía.";
        }
      } else {
        errorFoto =
          "Esta rendición no tiene fotografía almacenada en Drive.";
      }

      documentosConFoto.push({
        ...documento,
        fotoBase64,
        errorFoto
      });
    }

    // ------------------------------------------------------
    // LOGO
    // ------------------------------------------------------

    const informacionEmpresaPDF =
      await obtenerInformacionEmpresaPDF(
        empresa,
        appsScriptURL
      );

    const logoURL =
      informacionEmpresaPDF.logo;

    const nombreEmpresaPDF =
      informacionEmpresaPDF.nombre || empresa;

    // ------------------------------------------------------
    // TABLA DE DETALLE
    // ------------------------------------------------------

    const filasDetalle =
      documentos
        .map((documento) => {
          const estadoDocumento =
            obtenerEstadoDocumento(documento);

          const motivoRechazo = String(
            documento.revision_motivo || ""
          ).trim();

          return `
            <tr class="${estadoDocumento === "RECHAZADO" ? "fila-rechazada" : ""}">

              <td>
                ${escaparHTMLPDF(
                  formatearFechaComprobantes(
                    documento.fecha_documento
                  )
                )}
              </td>

              <td>
                ${escaparHTMLPDF(
                  documento.numero_documento ||
                  "-"
                )}
              </td>

              <td>
                ${escaparHTMLPDF(
                  documento.proveedor ||
                  "-"
                )}
              </td>

              <td>
                ${escaparHTMLPDF(
                  documento.tipo_documento ||
                  "-"
                )}
              </td>

              <td>
                ${escaparHTMLPDF(
                  documento.descripcion ||
                  "-"
                )}
              </td>

              <td class="monto">
                ${formatearDineroComprobantes(
                  convertirMontoComprobantes(
                    documento.monto_total
                  )
                )}
              </td>

              <td class="estado-documento">
                ${crearEstadoDocumentoPDF(
                  estadoDocumento,
                  motivoRechazo
                )}
              </td>

            </tr>
          `;
        })
        .join("");

    // ------------------------------------------------------
    // ANEXOS
    // ------------------------------------------------------

    const anexos =
      documentosConFoto
        .map(
          (
            documento,
            indice
          ) => {

            const estadoDocumento =
              obtenerEstadoDocumento(documento);

            const motivoRechazo = String(
              documento.revision_motivo || ""
            ).trim();

            const fotografiaHTML =
              documento.fotoBase64
                ? `
                  <div class="foto-contenedor">

                    <img
                      src="${documento.fotoBase64}"
                      alt="Comprobante ${indice + 1}"
                    >

                  </div>
                `
                : `
                  <div class="foto-no-disponible">

                    <strong>
                      FOTOGRAFÍA NO DISPONIBLE
                    </strong>

                    <br><br>

                    ${escaparHTMLPDF(
                      documento.errorFoto ||
                      ""
                    )}

                  </div>
                `;

            return `
              <section class="pagina-anexo">

                <div class="encabezado-anexo">

                  <div>

                    <div class="titulo-anexo">
                      COMPROBANTE
                      ${indice + 1}
                      DE
                      ${documentos.length}
                    </div>

                    <div class="folio-anexo">
                      Rendición:
                      <strong>
                        ${escaparHTMLPDF(folio)}
                      </strong>
                    </div>

                  </div>

                  <img
                    class="logo-anexo"
                    src="${logoURL}"
                    alt="${escaparHTMLPDF(nombreEmpresaPDF)}"
                  >

                </div>


                <table class="datos-comprobante">

                  <tr>

                    <td class="label">
                      COLABORADOR
                    </td>

                    <td colspan="3">
                      ${escaparHTMLPDF(
                        colaborador
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      VIAJE / RUTA
                    </td>

                    <td>
                      ${escaparHTMLPDF(
                        viaje
                      )}
                    </td>

                    <td class="label">
                      FECHA
                    </td>

                    <td>
                      ${escaparHTMLPDF(
                        formatearFechaComprobantes(
                          documento.fecha_documento
                        )
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      PROVEEDOR
                    </td>

                    <td colspan="3">
                      ${escaparHTMLPDF(
                        documento.proveedor ||
                        "-"
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      N° DOCUMENTO
                    </td>

                    <td>
                      ${escaparHTMLPDF(
                        documento.numero_documento ||
                        "-"
                      )}
                    </td>

                    <td class="label">
                      TIPO
                    </td>

                    <td>
                      ${escaparHTMLPDF(
                        documento.tipo_documento ||
                        "-"
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      DESCRIPCIÓN
                    </td>

                    <td colspan="3">
                      ${escaparHTMLPDF(
                        documento.descripcion ||
                        "-"
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      MONTO
                    </td>

                    <td colspan="3" class="monto-destacado">

                      ${formatearDineroComprobantes(
                        convertirMontoComprobantes(
                          documento.monto_total
                        )
                      )}

                    </td>

                  </tr>

                </table>


                <div class="estado-anexo ${estadoDocumento.toLowerCase()}">

                  <strong>
                    ESTADO DEL COMPROBANTE:
                    ${escaparHTMLPDF(estadoDocumento)}
                  </strong>

                  ${
                    estadoDocumento === "RECHAZADO"
                      ? `
                        <div class="motivo-anexo">
                          MOTIVO: ${escaparHTMLPDF(motivoRechazo || "Sin motivo registrado")}
                        </div>
                      `
                      : ""
                  }

                </div>


                ${fotografiaHTML}


                <div class="pie-anexo">

                  Documento
                  ${indice + 1}
                  de
                  ${documentos.length}

                  &nbsp; | &nbsp;

                  Rendición
                  ${escaparHTMLPDF(folio)}

                </div>

              </section>
            `;
          }
        )
        .join("");

    // ------------------------------------------------------
    // CREAR VENTANA
    // ------------------------------------------------------

    const ventana =
      window.open(
        "",
        "_blank"
      );

    if (!ventana) {
      alert(
        "El navegador bloqueó la ventana de impresión."
      );
      return;
    }

    // ------------------------------------------------------
    // HTML DEL PDF
    // ------------------------------------------------------

    ventana.document.write(`
      <!DOCTYPE html>

      <html lang="es">

      <head>

        <meta charset="UTF-8">

        <title>
          Rendición Completa ${escaparHTMLPDF(folio)}
        </title>


        <style>

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
            padding:20px 0;
            background: #e9ecef;
            font-family: Arial, sans-serif;
          }


          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #111111;

            font-size: 11px;

            line-height: 1.35;
          }


          .pagina {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
          }


          /* =========================================
             PORTADA / RESUMEN
          ========================================= */


          .titulo-principal {
            font-size: 21px;
            font-weight: 700;
            margin-bottom: 12px;
          }


          .cabecera {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }


          .cabecera > tbody > tr > td {
            border: 1px solid #333333;
            vertical-align: middle;
          }


          .logo-cell {
            width: 42%;
            height: 118px;
            padding: 4px;
            text-align: center;
          }


          .logo-cell img {
            display: block;
            width: 96%;
            height: 108px;
            margin: 0 auto;
            object-fit: contain;
          }


          .datos-cell {
            width: 58%;
            padding: 0;
          }


          .datos-internos {
            width: 100%;
            border-collapse: collapse;
          }


          .datos-internos td {
            padding: 6px 9px;
            border-bottom: 1px solid #555555;
          }


          .datos-internos tr:last-child td {
            border-bottom: none;
          }


          .datos-internos .label {
            width: 42%;
            font-weight: bold;
            background: #f7f7f7;
          }


          .nombre {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }


          .nombre td {
            border: 1px solid #333333;
            padding: 8px 10px;
          }


          .resumen-superior {
            width: 72%;
            margin-left: auto;
            margin-bottom: 15px;
            border-collapse: collapse;
          }


          .resumen-superior th,
          .resumen-superior td {
            border: 1px solid #333333;
            padding: 7px 9px;
          }


          .resumen-superior th {
            background: #f5f5f5;
            text-align: center;
          }


          /* =========================================
             DETALLE
          ========================================= */


          .subtitulo {
            font-size: 14px;
            font-weight: bold;
            margin-top: 18px;
            margin-bottom: 7px;
          }


          .detalle {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 15px;
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
            padding: 5px;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }


          .detalle th {
            background: #f2f2f2;
            text-align: center;
            font-size: 9px;
          }


          .detalle td {
            font-size: 9px;
          }


          .detalle th:nth-child(1),
          .detalle td:nth-child(1) {
            width: 10%;
          }


          .detalle th:nth-child(2),
          .detalle td:nth-child(2) {
            width: 12%;
          }


          .detalle th:nth-child(3),
          .detalle td:nth-child(3) {
            width: 17%;
          }


          .detalle th:nth-child(4),
          .detalle td:nth-child(4) {
            width: 10%;
          }


          .detalle th:nth-child(5),
          .detalle td:nth-child(5) {
            width: 25%;
          }


          .detalle th:nth-child(6),
          .detalle td:nth-child(6) {
            width: 11%;
          }


          .detalle th:nth-child(7),
          .detalle td:nth-child(7) {
            width: 15%;
          }


          .fila-rechazada td {
            background: #fff1f1;
          }


          .estado-documento {
            text-align: center;
            font-size: 8px !important;
          }


          .estado-etiqueta {
            display: inline-block;
            padding: 2px 5px;
            border-radius: 3px;
            color: #ffffff;
            font-weight: bold;
          }


          .estado-etiqueta.autorizado {
            background: #198754;
          }


          .estado-etiqueta.rechazado {
            background: #dc3545;
          }


          .estado-etiqueta.pendiente {
            background: #ffc107;
            color: #111111;
          }


          .motivo-rechazo-pdf {
            margin-top: 4px;
            color: #a30000;
            font-size: 7px;
            font-weight: bold;
          }


          .monto {
            text-align: right;
            white-space: nowrap;
          }


          /* =========================================
             TOTALES
          ========================================= */


          .totales {
            width: 52%;
            margin-left: auto;
            border-collapse: collapse;
            margin-top: 15px;
          }


          .totales td {
            border: 1px solid #333333;
            padding: 7px 9px;
          }


          .totales td:last-child {
            text-align: right;
            white-space: nowrap;
          }


          .total-principal {
            font-weight: bold;
            font-size: 12px;
          }


          .total-autorizado td {
            background: #d1e7dd;
            color: #0f5132;
            font-weight: bold;
          }


          .total-rechazado td {
            background: #f8d7da;
            color: #842029;
            font-weight: bold;
          }


          .saldo-trabajador td {
            background: #fff3a0;
            font-weight: bold;
          }


          /* =========================================
             AUTORIZACIÓN DIGITAL
          ========================================= */


          .autorizacion {
            margin-top: 18px;
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
            padding: 7px 9px;
            border: none;
            border-top: 1px solid #b7ddc9;
            vertical-align: top;
            font-size: 9px;
          }


          .autorizacion-label {
            display: block;
            margin-bottom: 3px;
            color: #555555;
            font-size: 8px;
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


          .autorizacion.parcial {
            border-color: #0d6efd;
          }


          .autorizacion.parcial .autorizacion-titulo {
            background: #0d6efd;
          }


          .autorizacion.rechazada {
            border-color: #dc3545;
          }


          .autorizacion.rechazada .autorizacion-titulo {
            background: #dc3545;
          }


          .autorizacion-pendiente-texto {
            padding: 11px 10px;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
          }


          /* =========================================
             PORTADA ANEXO
          ========================================= */


          .inicio-anexos {
             width: 190mm;
                max-width: 190mm;
                min-height: 277mm;

                margin: 20px auto;
                padding: 65mm 10mm 10mm;

                box-sizing: border-box;
                     background: #ffffff;

                     page-break-before: always;
                 text-align: center;
            }


          .inicio-anexos img {
            width: 90mm;
            max-height: 45mm;
            object-fit: contain;
            margin-bottom: 25mm;
          }


          .inicio-anexos h1 {
            font-size: 25px;
            margin-bottom: 8px;
          }


          .inicio-anexos h2 {
            font-size: 17px;
            font-weight: normal;
            margin-top: 0;
          }


          /* =========================================
             COMPROBANTES
          ========================================= */


          .pagina-anexo {
            width: 190mm;
             max-width: 190mm;
            min-height: 277mm;

             margin: 20px auto;
             padding: 10mm;

             box-sizing: border-box;
             background: #ffffff;

                page-break-before: always;
            position: relative;
            }


          .encabezado-anexo {
            display: flex;
            justify-content: space-between;
            align-items: center;

            border-bottom:
              2px solid #222222;

            padding-bottom: 8px;

            margin-bottom: 10px;
          }


          .titulo-anexo {
            font-size: 17px;
            font-weight: bold;
          }


          .folio-anexo {
            margin-top: 4px;
            font-size: 10px;
          }


          .logo-anexo {
            width: 55mm;
            height: 22mm;
            object-fit: contain;
          }


          .datos-comprobante {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }


          .datos-comprobante td {
            border: 1px solid #333333;
            padding: 6px 7px;
            font-size: 9px;
          }


          .datos-comprobante .label {
            width: 19%;
            background: #f4f4f4;
            font-weight: bold;
          }


          .monto-destacado {
            font-weight: bold;
            font-size: 11px !important;
          }


          .estado-anexo {
            margin-bottom: 12px;
            padding: 7px 9px;
            border: 1px solid #d39e00;
            background: #fff8db;
            font-size: 9px;
          }


          .estado-anexo.autorizado {
            border-color: #198754;
            background: #e9f7ef;
            color: #145c32;
          }


          .estado-anexo.rechazado {
            border-color: #dc3545;
            background: #fff1f1;
            color: #a30000;
          }


          .motivo-anexo {
            margin-top: 4px;
          }


          .foto-contenedor {
            width: 100%;
            height: 180mm;

            display: flex;
            justify-content: center;
            align-items: center;

            overflow: hidden;

            border: 1px solid #cccccc;

            padding: 4mm;

            background: #fafafa;
          }


          .foto-contenedor img {
            max-width: 100%;
            max-height: 100%;

            width: auto;
            height: auto;

            object-fit: contain;

            display: block;
          }


          .foto-no-disponible {
            width: 100%;
            height: 150mm;

            display: flex;
            flex-direction: column;

            justify-content: center;
            align-items: center;

            text-align: center;

            border:
              1px dashed #999999;

            color: #777777;
          }


          .pie-anexo {
            margin-top: 8px;
            padding-top: 6px;

            border-top:
              1px solid #dddddd;

            text-align: center;

            color: #777777;

            font-size: 8px;
          }


          /* =========================================
             PIE GENERAL
          ========================================= */


          .pie-general {
            margin-top: 30px;
            padding-top: 8px;

            border-top:
              1px solid #dddddd;

            color: #777777;

            font-size: 8px;

            text-align: center;
          }


           @media print {

            body {
             margin: 0;
            padding: 0;
            background: #ffffff;

            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            }

            .pagina,
            .inicio-anexos,
            .pagina-anexo {
                margin: 0 auto;
            }

}

        </style>

      </head>


      <body>


        <!-- ======================================
             RENDICIÓN
        ======================================= -->


        <div class="pagina">


          <div class="titulo-principal">

            RENDICIÓN DE GASTOS

          </div>


          <table class="cabecera">

            <tr>


              <td class="logo-cell">

                <img
                  src="${logoURL}"
                  alt="Logo ${escaparHTMLPDF(nombreEmpresaPDF)}"
                >

              </td>


              <td class="datos-cell">

                <table class="datos-internos">


                  <tr>

                    <td class="label">
                      EMPRESA:
                    </td>

                    <td>
                      ${escaparHTMLPDF(nombreEmpresaPDF)}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      FOLIO:
                    </td>

                    <td>
                      ${escaparHTMLPDF(folio)}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      CENTRO DE COSTOS:
                    </td>

                    <td>
                      ${escaparHTMLPDF(centroCosto)}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      RUT:
                    </td>

                    <td>
                      ${escaparHTMLPDF(rut)}
                    </td>

                  </tr>


                  <tr>

                    <td class="label">
                      VIAJE / RUTA:
                    </td>

                    <td>
                      ${escaparHTMLPDF(viaje)}
                    </td>

                  </tr>


                </table>

              </td>


            </tr>

          </table>


          <table class="nombre">

            <tr>

              <td>

                <strong>
                  NOMBRE:
                </strong>

                &nbsp;&nbsp;

                ${escaparHTMLPDF(colaborador)}

              </td>

            </tr>

          </table>


          <table class="resumen-superior">


            <tr>

              <th>
                MONTO ASIGNADO
              </th>

              <th>
                TOTAL PRESENTADO
              </th>

              <th>
                TOTAL AUTORIZADO
              </th>

              <th>
                DOCUMENTOS
              </th>

            </tr>


            <tr>

              <td class="monto">

                ${formatearDineroComprobantes(
                  montoAsignado
                )}

              </td>


              <td class="monto">

                ${formatearDineroComprobantes(
                  totalPresentado
                )}

              </td>


              <td class="monto">

                ${formatearDineroComprobantes(
                  totalAutorizado
                )}

              </td>


              <td style="text-align:center">

                ${documentos.length}

              </td>

            </tr>


          </table>


          <div class="subtitulo">

            DETALLE DE LA RENDICIÓN

          </div>


          <table class="detalle">


            <thead>

              <tr>

                <th>
                  FECHA
                </th>

                <th>
                  N° DOCUMENTO
                </th>

                <th>
                  PROVEEDOR
                </th>

                <th>
                  TIPO
                </th>

                <th>
                  DESCRIPCIÓN
                </th>

                <th>
                  MONTO
                </th>

                <th>
                  REVISIÓN
                </th>

              </tr>

            </thead>


            <tbody>

              ${filasDetalle}

            </tbody>


          </table>


          <table class="totales">


            <tr class="total-principal">

              <td>
                TOTAL PRESENTADO
              </td>

              <td>

                ${formatearDineroComprobantes(
                  totalPresentado
                )}

              </td>

            </tr>


            <tr class="total-autorizado">

              <td>
                TOTAL AUTORIZADO
              </td>

              <td>
                ${formatearDineroComprobantes(totalAutorizado)}
              </td>

            </tr>


            <tr class="${totalRechazado > 0 ? "total-rechazado" : ""}">

              <td>
                TOTAL RECHAZADO
              </td>

              <td>
                ${formatearDineroComprobantes(totalRechazado)}
              </td>

            </tr>


            <tr>

              <td>
                PENDIENTE DE REVISIÓN
              </td>

              <td>
                ${formatearDineroComprobantes(totalPendiente)}
              </td>

            </tr>


            <tr>

              <td>
                SALDO A FAVOR EMPRESA
              </td>

              <td>

                ${formatearDineroComprobantes(
                  saldoEmpresa
                )}

              </td>

            </tr>


            <tr
              class="${
                saldoTrabajador > 0
                  ? "saldo-trabajador"
                  : ""
              }"
            >

              <td>
                SALDO A FAVOR TRABAJADOR
              </td>

              <td>

                ${formatearDineroComprobantes(
                  saldoTrabajador
                )}

              </td>

            </tr>


          </table>


          <!-- AUTORIZACIÓN DIGITAL -->

          ${
            revisionFinalizada
              ? `
                <div class="autorizacion ${claseEstadoRendicionPDF(estadoRendicion)}">

                  <div class="autorizacion-titulo">
                    ESTADO: ${escaparHTMLPDF(etiquetaEstadoRendicionPDF(estadoRendicion))}
                  </div>

                  <table class="autorizacion-contenido">

                    <tr>

                      <td>
                        <span class="autorizacion-label">
                          REVISADO POR
                        </span>

                        <span class="autorizacion-valor">
                          ${escaparHTMLPDF(autorizadoNombre)}
                        </span>
                      </td>

                      <td>
                        <span class="autorizacion-label">
                          FECHA DE REVISIÓN
                        </span>

                        <span class="autorizacion-valor">
                          ${escaparHTMLPDF(autorizadoEn)}
                        </span>
                      </td>

                    </tr>

                    <tr>

                      <td>
                        <span class="autorizacion-label">
                          CORREO
                        </span>

                        <span class="autorizacion-valor">
                          ${escaparHTMLPDF(autorizadoPor)}
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
                    ESTADO: PENDIENTE
                  </div>

                  <div class="autorizacion-pendiente-texto">
                    PENDIENTE DE AUTORIZACIÓN POR JEFE DE ÁREA
                  </div>

                </div>
              `
          }


          <div class="pie-general">

            Documento generado por
            Sistema de Rendiciones
            ${escaparHTMLPDF(nombreEmpresaPDF)}

          </div>


        </div>


        <!-- ======================================
             PORTADA DEL ANEXO
        ======================================= -->


        <section class="inicio-anexos">


          <img
            src="${logoURL}"
            alt="${escaparHTMLPDF(nombreEmpresaPDF)}"
          >


          <h1>

            ANEXO DE COMPROBANTES

          </h1>


          <h2>

            Rendición
            ${escaparHTMLPDF(folio)}

          </h2>


          <p>

            ${escaparHTMLPDF(colaborador)}

            <br>

            Viaje:
            ${escaparHTMLPDF(viaje)}

            <br><br>

            ${documentos.length}
            comprobante${
              documentos.length === 1
                ? ""
                : "s"
            }

          </p>


        </section>


        <!-- ======================================
             FOTOGRAFÍAS
        ======================================= -->


        ${anexos}


      </body>

      </html>
    `);

    ventana.document.close();

    // ------------------------------------------------------
    // ESPERAR QUE TODAS LAS IMÁGENES CARGUEN
    // ------------------------------------------------------

    await esperarImagenesPDF(
      ventana
    );

    setTimeout(
      () => {
        ventana.focus();
        ventana.print();
      },
      500
    );

  } catch (error) {

    console.error(
      "Error generando PDF completo:",
      error
    );

    alert(
      "No fue posible generar el PDF completo.\n\n" +
      error.message
    );

  } finally {

    if (boton) {
      boton.disabled = false;
      boton.innerHTML =
        textoOriginal;
    }

  }
}



// ==========================================================
// EMPRESA Y LOGO DEL PDF
// ==========================================================

async function obtenerInformacionEmpresaPDF(
  codigoEmpresa,
  appsScriptURL
) {
  const codigoNormalizado =
    normalizarEmpresaPDF(codigoEmpresa);

  const logoRespaldo = new URL(
    "../assets/img/logo.png",
    window.location.href
  ).href;

  const logosLocales = {
    TRANSSER: new URL(
      "../assets/img/logo-transser.jpeg",
      window.location.href
    ).href,
    SERVIND: new URL(
      "../assets/img/logo-servind.jpeg",
      window.location.href
    ).href
  };

  const logoLocalEmpresa =
    logosLocales[codigoNormalizado] || "";

  const resultado = {
    codigo: codigoEmpresa || "",
    nombre: codigoEmpresa || "TRANSSER",
    rut: "",
    logo: logoLocalEmpresa || logoRespaldo
  };

  try {
    if (typeof solicitarAppsScript !== "function") {
      return resultado;
    }

    const empresas = await solicitarAppsScript({
      empresas: "1"
    });

    if (!Array.isArray(empresas)) {
      return resultado;
    }

    const empresaEncontrada = empresas.find((item) => {
      const codigo = normalizarEmpresaPDF(item.codigo_empresa);
      const nombre = normalizarEmpresaPDF(item.nombre_empresa);

      return codigo === codigoNormalizado || nombre === codigoNormalizado;
    });

    if (!empresaEncontrada) {
      return resultado;
    }

    resultado.codigo =
      empresaEncontrada.codigo_empresa || codigoEmpresa || "";

    resultado.nombre =
      empresaEncontrada.nombre_empresa || resultado.codigo || resultado.nombre;

    resultado.rut =
      empresaEncontrada.rut_empresa || "";

    const logoConfigurado = String(
      empresaEncontrada.logo_url || ""
    ).trim();

    // TRANSSER y SERVIND usan archivos locales para evitar
    // bloqueos de Drive durante la generación del PDF.
    // logo_url queda como alternativa para empresas futuras.
    if (!logoLocalEmpresa && logoConfigurado) {
      resultado.logo = await convertirLogoEmpresaPDF(
        logoConfigurado,
        appsScriptURL
      );
    }
  } catch (error) {
    console.warn(
      "No fue posible obtener el logo configurado de la empresa:",
      error
    );
  }

  return resultado;
}


async function convertirLogoEmpresaPDF(
  logoConfigurado,
  appsScriptURL
) {
  const idDrive =
    extraerIdDrivePDF(logoConfigurado);

  if (!idDrive) {
    return logoConfigurado;
  }

  try {
    const respuesta = await fetch(
      `${appsScriptURL}?foto=${encodeURIComponent(idDrive)}`,
      { cache: "no-store" }
    );

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    if (datos.dataUrl) {
      return datos.dataUrl;
    }
  } catch (error) {
    console.warn(
      "No fue posible convertir el logo de Drive:",
      error
    );
  }

  return logoConfigurado;
}


function normalizarEmpresaPDF(valor) {
  const texto = String(valor || "")
    .trim()
    .toUpperCase();

  if (texto === "SERVICIOS INDUSTRIALES") {
    return "SERVIND";
  }

  return texto;
}


// ==========================================================
// ESTADOS DE REVISIÓN DEL PDF
// ==========================================================

function crearEstadoDocumentoPDF(
  estado,
  motivo
) {
  const estadoNormalizado = String(
    estado || "PENDIENTE"
  ).trim().toUpperCase();

  const clase =
    estadoNormalizado.toLowerCase();

  return `
    <span class="estado-etiqueta ${escaparHTMLPDF(clase)}">
      ${escaparHTMLPDF(estadoNormalizado)}
    </span>
    ${
      estadoNormalizado === "RECHAZADO"
        ? `
          <div class="motivo-rechazo-pdf">
            ${escaparHTMLPDF(motivo || "Sin motivo registrado")}
          </div>
        `
        : ""
    }
  `;
}


function etiquetaEstadoRendicionPDF(estado) {
  const estadoNormalizado = String(
    estado || "PENDIENTE"
  ).trim().toUpperCase();

  const etiquetas = {
    AUTORIZADA: "AUTORIZADA",
    AUTORIZADA_PARCIAL: "AUTORIZADA PARCIALMENTE",
    RECHAZADA: "RECHAZADA",
    PENDIENTE: "PENDIENTE"
  };

  return etiquetas[estadoNormalizado] || estadoNormalizado;
}


function claseEstadoRendicionPDF(estado) {
  const estadoNormalizado = String(
    estado || "PENDIENTE"
  ).trim().toUpperCase();

  if (estadoNormalizado === "AUTORIZADA_PARCIAL") return "parcial";
  if (estadoNormalizado === "RECHAZADA") return "rechazada";
  if (estadoNormalizado === "PENDIENTE") return "pendiente";
  return "";
}



// ==========================================================
// OBTENER URL DEL APPS SCRIPT
// ==========================================================

function obtenerURLAppsScriptPDF() {
  return "https://script.google.com/macros/s/AKfycbxmTVcAquO3EQZvXQg2DzxRBfP4KCJ6cEqMv3pHFaeaM0z01rYiuuV3sXHupizB-hwakg/exec";
}
 




// ==========================================================
// EXTRAER ID DE GOOGLE DRIVE
// ==========================================================

function extraerIdDrivePDF(valor) {

  const texto =
    String(
      valor || ""
    ).trim();


  if (!texto) {
    return "";
  }


  const marcador =
    "/file/d/";


  const posicion =
    texto.indexOf(
      marcador
    );


  if (posicion >= 0) {

    const resto =
      texto.substring(
        posicion +
        marcador.length
      );

    return resto
      .split("/")[0]
      .split("?")[0];

  }


  // Si ya viene solamente el ID.

  if (
    !texto.includes("/") &&
    !texto.includes("?")
  ) {

    return texto;

  }


  return "";

}



// ==========================================================
// ESPERAR CARGA DE IMÁGENES
// ==========================================================

function esperarImagenesPDF(
  ventana
) {

  return new Promise(
    (resolver) => {

      const imagenes =
        Array.from(
          ventana.document.images
        );


      if (
        imagenes.length === 0
      ) {

        resolver();
        return;

      }


      let pendientes =
        imagenes.length;


      const terminar = () => {

        pendientes--;

        if (
          pendientes <= 0
        ) {

          resolver();

        }

      };


      imagenes.forEach(
        (imagen) => {

          if (
            imagen.complete
          ) {

            terminar();

          } else {

            imagen.addEventListener(
              "load",
              terminar,
              {
                once: true
              }
            );

            imagen.addEventListener(
              "error",
              terminar,
              {
                once: true
              }
            );

          }

        }
      );


      // Protección:
      // aunque una imagen quede colgada,
      // después de 8 segundos continuamos.

      setTimeout(
        resolver,
        8000
      );

    }
  );

}



// ==========================================================
// MONTO
// ==========================================================

function convertirMontoComprobantes(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return 0;

  }


  const limpio =
    String(valor)
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
      .replace(/\s/g, "");


  return (
    Number(limpio) ||
    0
  );

}



function formatearDineroComprobantes(
  valor
) {

  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }
  ).format(
    Number(valor) || 0
  );

}



// ==========================================================
// FECHA
// ==========================================================

function formatearFechaComprobantes(
  fecha
) {

  if (
    !fecha ||
    fecha === "-"
  ) {

    return "-";

  }


  const texto =
    String(fecha).trim();


  const partes =
    texto.split("-");


  if (
    partes.length === 3
  ) {

    return (
      partes[2] +
      "/" +
      partes[1] +
      "/" +
      partes[0]
    );

  }


  return texto;

}



// ==========================================================
// SEGURIDAD HTML
// ==========================================================

function escaparHTMLPDF(
  valor
) {

  return String(
    valor ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function formatearFechaHoraComprobantes(
  valor
) {

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
