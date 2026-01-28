## Arquitectura

### Capas

- `paginas/`: vistas y flujo de navegación.
- `componentes/`: UI reutilizable y componentes por dominio.
- `contextos/`: estado global (auth).
- `ganchos/`: hooks y lógica compartida.
- `servicios/`: cliente Supabase y tipos.
- `utilidades/`: helpers, validaciones y utilidades generales.

### Flujo de autenticacion

1. Registro: `signUp` con `emailRedirectTo` a `/auth?verificado=1`.
2. Login: valida email verificado; si no, bloquea y permite reenvio.
3. Reset: flujo desde `/auth` a `/set-password`.

### Base de datos

Migraciones principales:
- `20260124000000_esquema_bd.sql` (tablas, funciones, RLS, triggers)
- `20260124000001_datos_iniciales.sql` (semillas)

### RLS checklist (antes de produccion)

- Admin puede crear/editar/eliminar recursos, eventos y usuarios.
- Estudiantes solo acceden a sus datos y recursos publicos.
- Notificaciones y alertas con lectura/actualizacion solo del propietario.

