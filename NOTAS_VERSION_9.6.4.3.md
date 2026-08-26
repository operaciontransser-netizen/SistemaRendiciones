# Sistema de Rendiciones 9.6.4.3

Fecha: 26-08-2026

## Mejora aplicada

- El historial de abonos deja de mostrar filas `LEGACY` que no tienen `ID_ABONO` y cuyo depósito es $0.
- Las filas permanecen intactas en la hoja `ABONOS`; el cambio afecta únicamente al listado mostrado en el sistema.
- Los movimientos históricos con monto real continúan visibles.
- Los abonos activos y anulados continúan visibles con su estado correspondiente.

## Compatibilidad

- No modifica el frontend, n8n ni la estructura de las hojas.
- No elimina ni altera información histórica.
- Después de copiar el Apps Script se debe volver a implementar el Web App.
