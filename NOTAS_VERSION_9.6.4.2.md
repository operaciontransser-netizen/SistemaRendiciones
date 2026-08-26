# Sistema de Rendiciones 9.6.4.2

Fecha: 26-08-2026

## Objetivo

Primera mejora interna de estabilidad, sin modificar el funcionamiento visible, el inicio de sesión, el frontend, las URLs ni el flujo n8n.

## Mejora aplicada

- La eliminación de rendiciones ahora utiliza `LockService` para impedir que dos solicitudes simultáneas alteren las mismas filas de `RESPUESTAS`.
- Se mantiene la verificación de rol SuperAdmin, la auditoría y la conservación del historial de duplicados.
- Los errores de bloqueo o escritura se devuelven como JSON controlado.

## Compatibilidad

- No requiere cambios en `rendiciones.js`.
- No requiere cambios en n8n.
- No cambia la estructura de las hojas.
- Después de copiar el Apps Script se debe volver a implementar el Web App.
