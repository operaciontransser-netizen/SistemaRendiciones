# Procedimiento seguro para actualizar versiones

Este procedimiento evita mezclar una actualización local con cambios nuevos del remoto y
evita agregar por accidente carpetas anidadas, documentos o credenciales.

## 1. Antes de copiar archivos

Abrir PowerShell en `D:\SistemaRendiciones` y ejecutar:

```powershell
git status
git pull --ff-only origin main
```

`git pull --ff-only` solo actualiza cuando no hay divergencias. Si `git status` no está
limpio, detenerse y revisar antes de copiar o hacer pull.

## 2. Copiar la nueva versión

- Extraer el ZIP fuera de `D:\SistemaRendiciones`.
- Copiar únicamente los archivos necesarios sobre el repositorio.
- Nunca copiar una carpeta `.git` ni una carpeta `SistemaRendiciones` completa dentro de
  otra carpeta con el mismo nombre.
- No copiar `.env`, tokens, documentos, planillas ni exportaciones.

## 3. Revisar antes del commit

```powershell
git status
powershell -ExecutionPolicy Bypass -File scripts/security-check.ps1
git diff --check
```

Revisar que la lista contenga solamente archivos esperados.

## 4. Preparar y comprobar el commit

```powershell
git add -A
powershell -ExecutionPolicy Bypass -File scripts/security-check.ps1 -Staged
git diff --cached --stat
git status
```

Si aparece un archivo inesperado:

```powershell
git restore --staged "RUTA_DEL_ARCHIVO"
```

Esto solo lo saca del commit; no borra el archivo local.

## 5. Publicar

```powershell
git commit -m "Actualiza Sistema de Rendiciones vX.Y.Z"
git push origin main
```

No ejecutar otro `pull --rebase` después de crear el commit. Si el push indica que el
remoto avanzó, detenerse y revisar la situación antes de integrar.

## 6. Etiqueta opcional después del push

```powershell
git tag -a vX.Y.Z -m "Sistema de Rendiciones vX.Y.Z"
git push origin vX.Y.Z
```

La etiqueta se crea únicamente cuando GitHub ya contiene el commit correcto y el sitio ha
sido verificado.
