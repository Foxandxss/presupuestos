// Esquema Drizzle. Las tablas de negocio (pedidos, líneas, consumos,
// proveedores, ...) llegan en slices posteriores; este pase añade la tabla
// `usuarios` para auth (slice 2).

import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const RolUsuario = {
  Admin: 'admin',
  Consultor: 'consultor',
} as const;

export type RolUsuario = (typeof RolUsuario)[keyof typeof RolUsuario];

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rol: text('rol', { enum: ['admin', 'consultor'] }).notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioNuevo = typeof usuarios.$inferInsert;
