// Esquema Drizzle. Pedidos, líneas, consumos y proyectos llegarán en slices
// posteriores; este pase añade el catálogo (proveedores, perfiles técnicos,
// recursos y servicios) sobre la tabla `usuarios` introducida en el slice 2.

import { sql } from 'drizzle-orm';
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

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

export const proveedores = sqliteTable('proveedores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Proveedor = typeof proveedores.$inferSelect;
export type ProveedorNuevo = typeof proveedores.$inferInsert;

export const perfilesTecnicos = sqliteTable('perfiles_tecnicos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type PerfilTecnico = typeof perfilesTecnicos.$inferSelect;
export type PerfilTecnicoNuevo = typeof perfilesTecnicos.$inferInsert;

export const recursos = sqliteTable('recursos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  proveedorId: integer('proveedor_id')
    .notNull()
    .references(() => proveedores.id, { onDelete: 'restrict' }),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Recurso = typeof recursos.$inferSelect;
export type RecursoNuevo = typeof recursos.$inferInsert;

export const servicios = sqliteTable(
  'servicios',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    proveedorId: integer('proveedor_id')
      .notNull()
      .references(() => proveedores.id, { onDelete: 'restrict' }),
    perfilTecnicoId: integer('perfil_tecnico_id')
      .notNull()
      .references(() => perfilesTecnicos.id, { onDelete: 'restrict' }),
    tarifaPorHora: real('tarifa_por_hora').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    proveedorPerfilUnique: uniqueIndex(
      'servicios_proveedor_perfil_unique',
    ).on(table.proveedorId, table.perfilTecnicoId),
  }),
);

export type Servicio = typeof servicios.$inferSelect;
export type ServicioNuevo = typeof servicios.$inferInsert;
