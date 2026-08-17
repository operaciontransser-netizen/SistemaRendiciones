// ======================================================
// LOGIN DEL SISTEMA DE RENDICIONES
// ======================================================


// ======================================================
// URL DE GOOGLE APPS SCRIPT
// ======================================================

const GOOGLE_SHEETS_API =
  "https://script.google.com/macros/s/AKfycbxmTVcAquO3EQZvXQg2DzxRBfP4KCJ6cEqMv3pHFaeaM0z01rYiuuV3sXHupizB-hwakg/exec";


// ======================================================
// INICIO
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log("login.js iniciado");


    const form =
      document.getElementById("formLogin");

    const emailInput =
      document.getElementById("email");

    const mensaje =
      document.getElementById("mensajeLogin");

    const boton =
      document.getElementById("btnLogin");


    // ==================================================
    // COMPROBAR ELEMENTOS
    // ==================================================

    if (
      !form ||
      !emailInput ||
      !mensaje ||
      !boton
    ) {

      console.error(
        "No se encontraron los elementos del login."
      );

      return;
    }


    // ==================================================
    // SI YA EXISTE SESIÓN
    // ==================================================

    const sesionExistente =
      localStorage.getItem(
        "usuarioActual"
      );


    if (sesionExistente) {

      try {

        const usuario =
          JSON.parse(
            sesionExistente
          );


        if (
          usuario &&
          usuario.email
        ) {

          console.log(
            "Sesión existente:",
            usuario
          );

        }

      } catch (error) {

        localStorage.removeItem(
          "usuarioActual"
        );

      }

    }


    // ==================================================
    // FORMULARIO LOGIN
    // ==================================================

    form.addEventListener(
      "submit",
      async (evento) => {

        evento.preventDefault();


        const email =
          String(
            emailInput.value || ""
          )
            .trim()
            .toLowerCase();


        if (!email) {

          mostrarMensaje(
            "Ingresa tu correo electrónico.",
            "danger"
          );

          return;
        }


        // ==============================================
        // ESTADO CARGANDO
        // ==============================================

        boton.disabled = true;

        boton.textContent =
          "Verificando...";


        ocultarMensaje();


        try {

          // ============================================
          // CONSULTAR APPS SCRIPT
          // ============================================

          const parametros =
            new URLSearchParams();


          parametros.set(
            "usuario",
            email
          );


          parametros.set(
            "debug",
            "1"
          );


          const url =
            `${GOOGLE_SHEETS_API}?${parametros.toString()}`;


          console.log(
            "Consultando usuario:",
            url
          );


          const respuesta =
            await fetch(url);


          if (!respuesta.ok) {

            throw new Error(
              `Error HTTP: ${respuesta.status}`
            );

          }


          const datos =
            await respuesta.json();


          console.log(
            "Respuesta del login:",
            datos
          );


          // ============================================
          // ERROR DEVUELTO POR APPS SCRIPT
          // ============================================

          if (datos.error) {

            mostrarMensaje(
              datos.error,
              "danger"
            );

            return;
          }


          // ============================================
          // VALIDAR PERMISOS
          // ============================================

          if (
            !datos.permisos ||
            !datos.permisos.encontrado
          ) {

            mostrarMensaje(
              "Usuario no autorizado.",
              "danger"
            );

            return;
          }


          if (
            datos.permisos.activo !== true
          ) {

            mostrarMensaje(
              "El usuario se encuentra inactivo.",
              "danger"
            );

            return;
          }


          // ============================================
          // CREAR SESIÓN
          // ============================================

          const usuario = {

            email:
              datos.permisos.email ||
              email,

            nombre:
              datos.permisos.nombre ||
              "",

            empresa:
              datos.permisos.empresa ||
              "",

            rol:
              datos.permisos.rol ||
              ""

          };


          localStorage.setItem(
            "usuarioActual",
            JSON.stringify(usuario)
          );


          console.log(
            "Usuario autenticado:",
            usuario
          );


          mostrarMensaje(
            "Ingreso correcto.",
            "success"
          );


          // ============================================
          // IR AL SISTEMA
          // ============================================

          setTimeout(
            () => {

              window.location.href =
                "../index.html";

            },
            300
          );


        } catch (error) {

          console.error(
            "Error iniciando sesión:",
            error
          );


          mostrarMensaje(
            "No fue posible conectar con el sistema.",
            "danger"
          );


        } finally {

          boton.disabled = false;

          boton.textContent =
            "Ingresar";

        }

      }
    );


    // ==================================================
    // MOSTRAR MENSAJE
    // ==================================================

    function mostrarMensaje(
      texto,
      tipo
    ) {

      mensaje.textContent =
        texto;


      mensaje.className =
        `alert alert-${tipo}`;

    }


    // ==================================================
    // OCULTAR MENSAJE
    // ==================================================

    function ocultarMensaje() {

      mensaje.textContent =
        "";


      mensaje.className =
        "alert d-none";

    }

  }
);