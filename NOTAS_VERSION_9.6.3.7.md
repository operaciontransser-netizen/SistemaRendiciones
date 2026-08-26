# Sistema Rendiciones — 9.6.3.7

## Objetivo
Optimizar las consultas sin cambiar la estructura de las hojas ni retirar funcionalidades existentes.

## Cambios
- Se conserva `.git` intacto.
- Se mantiene la eliminación de rendiciones exclusivamente para SUPER ADMIN y su auditoría.
- Se mantiene el historial de `COMPROBANTES_DUPLICADOS`.
- Se optimiza la búsqueda de una rendición mediante `TextFinder`, evitando cargar toda `RESPUESTAS` para abrir, autorizar, revisar o eliminar una rendición concreta.
- Se optimiza la identificación de duplicados de una rendición concreta mediante búsqueda exacta.
- Se agrega caché por petición para datos reutilizados de `RESPUESTAS` y `ABONOS`.
- Se evita volver a leer `COLABORADORES` una vez por cada fila de `RESPUESTAS`.
- Se agrega una caché breve del listado de rendiciones, con invalidación después de autorizaciones, revisiones y eliminaciones.
- Se conserva `numero_viaje` como dato mostrado en la lista. El cambio solicitado es solamente visual en el encabezado: `Centro de Costo / Viaje`.
- Se mantiene la columna `Monto` y se corrige el encabezado para que corresponda con ella.
- El monto de una rendición se suma una sola vez por comprobante/documento.
- En rendiciones excluidas solamente por duplicados, el monto mostrado corresponde al total de los comprobantes duplicados registrados.

## Archivos modificados respecto de la base 9.6.3.6
- `app script.txt`
- `assets/js/rendiciones.js`
- `pages/rendiciones.html`

No se modificó el directorio `.git`.
