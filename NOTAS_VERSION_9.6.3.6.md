# Sistema Rendiciones — versión 9.6.3.6

Cambios incluidos:

1. **Listado de Rendiciones**
   - Se reemplaza visualmente la columna `Viaje` por `Centro de Costos`.
   - Se agrega la columna `Monto`.
   - El monto corresponde a la suma de `monto_total` de los comprobantes de la rendición.
   - Para rendiciones que aparecen como `EXCLUIDA_POR_DUPLICADOS`, el monto se toma del total de comprobantes duplicados registrados.

2. **Eliminación de rendiciones**
   - El botón de eliminación se muestra únicamente a usuarios con rol `SUPER ADMIN`.
   - El backend vuelve a validar el rol antes de eliminar; ocultar el botón no es la única protección.
   - La eliminación registra un evento en `AUDITORIA_RENDICIONES`.
   - El historial de `COMPROBANTES_DUPLICADOS` no se elimina.

3. **Historial de duplicados**
   - Se conserva la trazabilidad existente mediante `COMPROBANTES_DUPLICADOS`, incluyendo `id_rendicion_actual`, `id_rendicion_original`, documento, monto, proveedor, clave y tipo de duplicado.
   - Las rendiciones excluidas por duplicados siguen pudiendo aparecer como `EXCLUIDA_POR_DUPLICADOS`.

4. **Versión backend**
   - `VERSION_CODIGO = RENDICIONES_9_6_3_6_2026-08-25`

## Importante

Después de actualizar el proyecto web, también se debe publicar/actualizar el Apps Script con el archivo `app script.txt` incluido en este paquete.
