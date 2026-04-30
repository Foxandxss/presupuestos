// Esquema mínimo de Drizzle. Las tablas de negocio (pedidos, líneas,
// consumos, proveedores, ...) llegan en slices posteriores; por ahora
// dejamos sólo la tabla de migraciones y un placeholder vacío para que el
// scaffold del módulo Drizzle esté operativo.

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
