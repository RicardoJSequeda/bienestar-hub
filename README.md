# Bienestar Hub

Aplicacion web para gestion de bienestar universitario: recursos, eventos, prestamos y horas de bienestar.

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth + database + realtime)
- Vitest (tests)

## Estructura (resumen)

```
src/
  componentes/   UI y componentes de dominio
  contextos/     Contextos globales (Auth)
  ganchos/       Hooks personalizados
  paginas/       Vistas de la app (admin y estudiante)
  servicios/     Cliente y tipos de Supabase
  utilidades/    Helpers y validaciones
  pruebas/       Tests (Vitest)
```

## Requisitos

- Node.js 18+
- npm

## Configuracion local

1. Instalar dependencias:
```
npm install
```

2. Variables de entorno (crear `.env.local`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Ejecutar:
```
npm run dev
```

## Scripts utiles

- `npm run dev` inicio local
- `npm run build` build de produccion
- `npm run test` tests
- `npm run lint` lint

## Base de datos (Supabase)

Migraciones consolidadas en:
- `supabase/migrations/20260124000000_esquema_bd.sql`
- `supabase/migrations/20260124000001_datos_iniciales.sql`

Para mas detalle, ver `docs/ARQUITECTURA.md`.

## Despliegue (Vercel)

- Ejecuta `npm run build`
- Configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Vercel

## Seguridad

No subir archivos `.env` al repositorio. Usar `.env.local`.
