# presupuestos

Monorepo NX con dos apps:

- `apps/api` — NestJS 11 + Drizzle ORM (SQLite) + Swagger en `/api/docs`.
- `apps/presupuestos` — Angular 21 standalone con signals, PrimeNG y Tailwind v4.

## Arrancar en local

```bash
npm install
npm run db:generate   # genera SQL de migraciones a partir del schema (sólo si cambias el schema)
npm run db:migrate    # aplica las migraciones contra ./presupuestos.sqlite
npm run db:seed       # crea usuarios por defecto (ver más abajo)
npm start             # api en :3000, frontend en :4200
```

## Credenciales por defecto (sólo desarrollo)

El seed crea dos usuarios fijos en `presupuestos.sqlite`:

| Rol         | Email                              | Contraseña     |
| ----------- | ---------------------------------- | -------------- |
| `admin`     | `admin@presupuestos.local`         | `admin123`     |
| `consultor` | `consultor@presupuestos.local`     | `consultor123` |

`POST /api/auth/login` devuelve `{ accessToken, usuario }`. El frontend persiste el JWT en `localStorage` y lo añade como `Authorization: Bearer <token>` a cada request a `/api`.

> **Producción.** Cambiar las credenciales antes de desplegar y exportar `JWT_SECRET` (por defecto `presupuestos-dev-secret-change-me`) y `JWT_EXPIRES_IN` (por defecto `12h`).

## Tests

```bash
npx nx run-many -t lint test
```
