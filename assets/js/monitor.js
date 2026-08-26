(function () {
  function usuarioActual() {
    try { return JSON.parse(localStorage.getItem("usuarioActual") || "null"); } catch (_) { return null; }
  }
  function rolNormalizado(rol) {
    return String(rol || "").trim().toUpperCase().replace(/_/g, " ").replace(/\\s+/g, " ");
  }
  async function cargarMonitor() {
    const usuario = usuarioActual();
    if (!usuario || !usuario.email) { location.href = "login.html"; return; }
    if (rolNormalizado(usuario.rol) !== "SUPER ADMIN") { location.href = "../index.html"; return; }

    const alerta = document.getElementById("alertaMonitor");
    alerta.className = "alert alert-info mt-4";
    alerta.textContent = "Actualizando monitor...";
    try {
      const p = new URLSearchParams({ usuario: usuario.email, accion: "monitor_sistema" });
      const r = await fetch(`${GOOGLE_SHEETS_API}?${p.toString()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (!d || d.ok !== true) throw new Error((d && d.error) || "Respuesta inválida");
      document.getElementById("mTotal").textContent = d.rendiciones.total;
      document.getElementById("mPendientes").textContent = d.rendiciones.pendientes;
      document.getElementById("mComprobantes").textContent = d.comprobantes.total;
      document.getElementById("mDuplicados").textContent = d.comprobantes.duplicados_historicos;
      document.getElementById("mUltima").textContent = d.ultima_actividad || "Sin actividad registrada";
      document.getElementById("mGenerado").textContent = d.generado_en ? `Actualizado: ${new Date(d.generado_en).toLocaleString("es-CL")}` : "";
      const tbody = document.getElementById("tablaAuditoria");
      tbody.innerHTML = "";
      (d.auditoria_reciente || []).forEach(function (a) {
        const tr = document.createElement("tr");
        [a.fecha, a.accion, a.id_rendicion, a.nombre_usuario || a.usuario, a.detalle].forEach(function (v) {
          const td = document.createElement("td"); td.textContent = v || "-"; tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      if (!(d.auditoria_reciente || []).length) tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Sin eventos de auditoría registrados.</td></tr>';
      alerta.className = "alert alert-success mt-4";
      alerta.textContent = "Monitor actualizado correctamente.";
    } catch (e) {
      alerta.className = "alert alert-danger mt-4";
      alerta.textContent = "No se pudo cargar el monitor: " + e.message;
    }
  }
  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("btnActualizar").addEventListener("click", cargarMonitor);
    cargarMonitor();
  });
})();
