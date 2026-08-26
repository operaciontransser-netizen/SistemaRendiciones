# Versión 9.6.4.0

## Cambios acotados
- Nuevo **Monitor del Sistema**, visible solo para Super Administrador.
- Endpoint `accion=monitor_sistema` protegido en Apps Script también por rol SuperAdmin.
- El monitor usa caché de 15 segundos para evitar lecturas repetidas.
- Muestra rendiciones, pendientes, comprobantes, duplicados históricos, última actividad y auditoría reciente.
- Se conserva el flujo existente de rendiciones, colaboradores, fondos, autorizaciones, duplicados y reportes.
- No se modifica `.git`.
- El JSON n8n conserva la corrección de nombres de archivos con espacios realizada en `Extraer Archivos`.

## Importante
El indicador de última actividad confirma datos registrados en Sheets; todavía no se presenta como un heartbeat real de n8n. Ese paso requiere definir un registro de ejecución desde n8n sin alterar el flujo productivo.
