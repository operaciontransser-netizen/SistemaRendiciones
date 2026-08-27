# Seguridad

Este repositorio contiene únicamente el frontend público y componentes de servidor sin
credenciales. No se deben publicar tokens, contraseñas, exportaciones de datos, documentos
de personas ni archivos de configuración local.

## Antes de cada commit

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security-check.ps1
git diff --check
```

Después de `git add`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/security-check.ps1 -Staged
git diff --cached --stat
```

## Si se publica un secreto

1. No limitarse a borrarlo del archivo.
2. Revocar o rotar inmediatamente la credencial en el servicio correspondiente.
3. Detener nuevos despliegues.
4. Limpiar el historial con una copia de respaldo y coordinación previa.
5. Verificar nuevamente el repositorio y los registros de acceso.

Los identificadores públicos y las URLs de frontend no se consideran autenticación.
