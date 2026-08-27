# Hallazgos y contención inmediata

## Hallazgo crítico

El login histórico no autentica identidad. Un correo enviado por el navegador determina
los permisos del usuario. `localStorage` y los parámetros de URL pueden ser modificados
por cualquier visitante.

## Riesgos relacionados

- operaciones financieras y administrativas ejecutadas mediante `GET`;
- diagnóstico que devuelve metadatos y permisos;
- código de Apps Script incluido en el repositorio público;
- correo de prueba incluido dentro del código;
- endpoint de Apps Script visible, como debe esperarse en cualquier frontend público.

## Lo que no se encontró

La búsqueda local no detectó formatos conocidos de tokens de Meta, tokens de GitHub,
claves privadas, claves Google API ni valores `Bearer` fijos en el repositorio o en los
commits disponibles. Esto no reemplaza un escáner de secretos en GitHub.

## Medidas antes del próximo despliegue

1. No publicar `app script.txt` ni exportaciones de datos.
2. Configurar Google OAuth y la API segura.
3. Migrar el login y validar permisos exclusivamente en servidor.
4. Eliminar el modo debug público.
5. Revocar el Web App de Apps Script antiguo solo después de que la API nueva esté probada.
6. Activar protección de ramas, revisión de secretos y autenticación de dos pasos.

Ocultar botones o hacer privado el repositorio no corrige por sí solo la autorización.
