# Sistema de Rendiciones — Versión 9.6.3.9

## Corrección sobre 9.6.3.8
- Se mantiene íntegra la optimización de caché de Rendiciones, Colaboradores y Dashboard.
- Se agrega transporte JSONP de respaldo exclusivamente cuando `fetch()` falla por CORS/red al consultar Google Apps Script desde localhost/127.0.0.1.
- Apps Script mantiene JSON normal para las llamadas existentes y responde JSONP solo cuando recibe un parámetro `callback` válido.
- Se corrige el detalle de rendición para que no dependa de la variable completa `datos` después de la optimización por búsqueda exacta; ahora reutiliza la primera fila coincidente ya leída.
- No se cambia la estructura de hojas, permisos, estados, flujo de autorización, duplicados ni lógica financiera.
- La carpeta `.git` se conserva sin modificaciones intencionales.
- Se corrige además la lectura de respuestas grandes guardadas comprimidas en `CacheService`: ahora se descomprimen con `Utilities.ungzip()` antes de interpretar el JSON, por lo que la caché de listados grandes sí puede reutilizarse efectivamente.
