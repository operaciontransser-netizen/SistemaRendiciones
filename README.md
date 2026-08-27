# Sistema de Rendiciones

Frontend web para consultar y administrar rendiciones, colaboradores, comprobantes y
abonos. El sitio público se sirve como archivos estáticos; las operaciones sensibles deben
realizarse únicamente mediante un backend autenticado.

## Seguridad

Antes de preparar un commit en Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security-check.ps1
```

Después de `git add`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security-check.ps1 -Staged
```

Consulta [SECURITY.md](SECURITY.md) y
[el procedimiento de actualización](docs/ACTUALIZAR_VERSIONES.md).

## Migración a PostgreSQL

La base inicial de la API y del esquema se encuentra en `backend/`. Esta parte todavía no
reemplaza el sistema en producción; se activará por módulos después de autenticar usuarios,
importar una copia de los datos y reconciliar totales contra Google Sheets.
