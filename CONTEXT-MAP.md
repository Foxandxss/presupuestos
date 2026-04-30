# Context Map

Este monorepo se organiza en torno a **un único bounded context**:

| Contexto      | Carpeta              | Glosario                                    | Resumen                                                                 |
| ------------- | -------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `Operaciones` | `libs/operaciones/`  | [`libs/operaciones/CONTEXT.md`](./libs/operaciones/CONTEXT.md) | Pedidos a proveedores por hora: catálogo, ciclo de vida del Pedido, consumos mensuales y reportes derivados. |

## Decisiones sistémicas

- ADR-0001: [Drizzle + SQLite](./docs/adr/0001-orm-drizzle-sqlite.md) — elección de ORM y base de datos.

## Cuándo añadir un nuevo contexto

Por ahora todo el dominio cabe en `Operaciones`. Si en el futuro aparece un dominio claramente separado (p. ej. una capa de finanzas, RRHH, integración con una herramienta corporativa) que tiene su propio lenguaje y reglas, se crea `libs/<contexto>/CONTEXT.md` y se enlaza aquí.

La aplicación comercial se llama **presupuestos**, pero el término canónico del dominio es **Pedido**. Ver `libs/operaciones/CONTEXT.md` para el glosario completo y los términos a evitar.
