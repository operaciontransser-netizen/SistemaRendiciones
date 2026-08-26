# Sistema de Rendiciones — Versión 9.6.3.8

## Objetivo
Optimizar la velocidad percibida y real de los módulos **Rendiciones**, **Colaboradores** y **Dashboard**, sin cambiar la lógica funcional existente.

## Cambios
- Se agregó caché de servidor de corta duración para los resultados de:
  - listado de Rendiciones;
  - listado de Colaboradores;
  - resumen financiero del Dashboard;
  - listado de Empresas;
  - permisos del usuario.
- La caché se versiona para invalidarse después de operaciones de escritura relevantes y además tiene expiración corta para absorber cambios externos.
- Los resultados grandes se comprimen y se almacenan en partes para respetar los límites de CacheService.
- En Rendiciones, para SUPER ADMIN, la carga de empresas y el primer listado se solicita en paralelo.
- Se agregó caché local de muy corta duración en el navegador para que al volver a entrar a un módulo pueda mostrarse inmediatamente la información reciente mientras se actualiza en segundo plano.
- No se modificó la estructura de las hojas ni los estados de negocio.
- Se mantiene el cambio visual **Centro de Costo / Viaje** y el dato mostrado continúa siendo `numero_viaje`.
- Se mantiene el campo **Monto** y las funciones existentes de detalle, autorización, rechazo, duplicados y eliminación SUPER ADMIN.

## Integridad
- La carpeta `.git` se conserva desde la versión anterior y no se regenera.
- No se cambiaron archivos de documentación/base de datos ni se eliminaron funcionalidades existentes.

## Archivos de código modificados en 9.6.3.8
- `app script.txt`
- `assets/js/googleSheets.js`
- `assets/js/rendiciones.js`
- `assets/js/colaboradores.js`
- `index.html`
