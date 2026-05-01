# presupuestos

Monorepo NX con dos apps:

- `apps/api` — NestJS 11 + Drizzle ORM (SQLite) + Swagger en `/api/docs`.
- `apps/presupuestos` — Angular 21 standalone con signals, PrimeNG y Tailwind v4.

## Arrancar en local

```bash
npm install
npm run db:generate   # genera SQL de migraciones a partir del schema (sólo si cambias el schema)
npm run db:migrate    # aplica las migraciones contra ./presupuestos.sqlite
npm run db:seed       # crea usuarios por defecto y un set de datos demo (ver más abajo)
npm start             # api en :3000, frontend en :4200
```

## Credenciales por defecto (sólo desarrollo)

El seed crea dos usuarios fijos en `presupuestos.sqlite`:

| Rol         | Email                | Contraseña     |
| ----------- | -------------------- | -------------- |
| `admin`     | `admin@demo.com`     | `admin123`     |
| `consultor` | `consultor@demo.com` | `consultor123` |

`POST /api/auth/login` devuelve `{ accessToken, usuario }`. El frontend persiste el JWT en `localStorage` y lo añade como `Authorization: Bearer <token>` a cada request a `/api`.

> **Producción.** Cambiar las credenciales antes de desplegar y exportar `JWT_SECRET` (por defecto `presupuestos-dev-secret-change-me`) y `JWT_EXPIRES_IN` (por defecto `12h`).

## Datos de demo

`db:seed` también poblará un set mínimo para que las pantallas tengan algo que mostrar nada más arrancar:

- 2 proveedores (Acme Tech, Beta Consulting), 4 perfiles técnicos, 5 servicios y 4 recursos.
- 2 proyectos con estimaciones por perfil (Migración Plataforma Web — abierto, Auditoría Seguridad Q2 2026 — con fecha fin).
- 3 pedidos representativos: uno en `Borrador`, otro en `Solicitado` y un tercero en `EnEjecucion` con tarifas congeladas y consumos previos.

El bloque catálogo/proyectos es idempotente (re-ejecutar `db:seed` no duplica filas). Los pedidos y consumos sólo se siembran cuando la tabla `pedidos` está vacía: una vez la app empieza a registrar pedidos reales, la semilla deja de tocarlos.

## Tests

```bash
npx nx run-many -t lint test
```
