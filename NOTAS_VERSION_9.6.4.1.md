# Sistema de Rendiciones 9.6.4.1

Fecha: 25-08-2026

## Correcciones

- Se corrigió el enrutamiento de eliminación de rendiciones: la acción normalizada en minúsculas ahora se compara con `eliminarrendicion`.
- Se actualizó la eliminación para impedir que una rendición borrada continúe apareciendo reconstruida desde `COMPROBANTES_DUPLICADOS`.
- El historial de comprobantes duplicados se conserva como auditoría.

## Archivo actualizado

- `app script.txt`

Después de copiar el Apps Script en Google Apps Script, se debe volver a implementar el Web App para publicar esta versión.
