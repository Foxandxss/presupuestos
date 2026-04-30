# ADR-0001 — ORM: Drizzle + SQLite

**Status:** Accepted
**Date:** 2026-04-30
**Scope:** Sistémico — afecta a `apps/api` y a cualquier consumidor futuro de la base de datos.

## Contexto

El backend (`apps/api`, NestJS) necesita una capa de persistencia. El PRD
fija SQLite como motor (un fichero local, sin servidor) y el equipo
quiere un ORM que sea:

1. Type-safe de extremo a extremo (TS infiere los tipos de las queries).
2. Cercano a SQL: la lógica está en SQL plano cuando hace falta,
   sin un DSL pesado encima.
3. Con una historia de migraciones decente (`drizzle-kit`).
4. Síncrono o capaz de driver síncrono (better-sqlite3) para evitar el
   overhead de promesas en el camino caliente.
5. Compatible con NestJS sin acoplar a un decorador propio.

## Opciones evaluadas

### Drizzle ORM (`drizzle-orm` + `better-sqlite3` + `drizzle-kit`)

- Esquema declarativo en TypeScript (`sqliteTable(...)`).
- Type-safe sin generación de tipos: el tipo se infiere del esquema.
- Driver `better-sqlite3` síncrono.
- Migraciones via `drizzle-kit generate` / `migrate`.
- API tipo SQL: `db.select().from(...).where(...)` en lugar de active
  record.

### Prisma

- Excelente DX, pero el schema vive en un DSL propio (`schema.prisma`)
  fuera de TypeScript.
- Engine binario externo. Más pesado para SQLite local.
- Migraciones potentes pero más opinionadas.

### TypeORM

- Madura pero el patrón "active record / data mapper" tiende a
  sobre-acoplar la capa de dominio al ORM.
- Tipado más débil que Drizzle/Prisma (decoradores + reflexión).

### MikroORM

- Patrón Unit of Work atractivo, pero su modelo de identidad y la
  necesidad de mantener entidades vivas no encaja con el estilo
  funcional/serverless ligero que queremos.

## Decisión

**Drizzle ORM con `better-sqlite3` y `drizzle-kit`** para migraciones.

Razones:

- Tipos derivados del esquema sin generación → mejor experiencia en NX
  (no hay paso intermedio de generación).
- Driver síncrono encaja con NestJS y no añade ceremonia de async donde
  no aporta valor.
- DSL más cercano a SQL → la complejidad se queda donde tiene que estar
  (la query) y no se filtra a la capa de dominio.
- Footprint mínimo: fichero local, ningún proceso aparte.

## Consecuencias

- **Repositorios delgados**: `db.select().from(...).where(...)` se llama
  desde repositorios livianos. Los **deep modules** (`MaquinaEstadosPedido`,
  `ValidadorConsumo`, etc.) no conocen Drizzle: reciben un `Database`
  inyectado y trabajan contra él.
- **Migraciones**: `npm run db:generate` produce SQL en
  `apps/api/drizzle/`, `npm run db:migrate` lo aplica.
- **Schema único**: `apps/api/src/db/schema.ts` es la fuente de verdad.
- **Importes**: SQLite almacena `REAL` para los importes en este MVP;
  si aparece pérdida de precisión real se reabre con un nuevo ADR.

## Revisión

Si más adelante necesitamos Postgres (multi-usuario concurrente, stored
procedures, índices avanzados) se reabre la decisión. Drizzle soporta
Postgres con un cambio de driver, así que la migración no es traumática.
