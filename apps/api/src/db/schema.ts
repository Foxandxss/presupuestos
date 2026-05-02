// Esquema Drizzle. Slice 6 añade ConsumosMensuales sobre Líneas de Pedido +
// Recursos.

import { sql } from 'drizzle-orm';
import {
  integer,
  sqliteTable,
  real,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import { ESTADOS_PEDIDO, Rol, type EstadoPedido } from '@operaciones/dominio';

export { ESTADOS_PEDIDO, Rol, type EstadoPedido };

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull().default(''),
  passwordHash: text('password_hash').notNull(),
  rol: text('rol', { enum: ['admin', 'consultor'] }).notNull(),
  // suspendido bloquea el login sin perder el registro. Se usa para deshabilitar
  // temporalmente a un usuario (toggle desde la pagina de admin).
  suspendido: integer('suspendido', { mode: 'boolean' })
    .notNull()
    .default(false),
  // soft delete: cuando esta presente, el usuario queda fuera del listado
  // (salvo flag explicito) y el login lo trata como inexistente. Usuarios
  // referenciados por consumos/historial siguen existiendo en la fila para
  // preservar el audit log via FK ON DELETE SET NULL.
  eliminadoEn: text('eliminado_en'),
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

export const proyectos = sqliteTable('proyectos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull().unique(),
  descripcion: text('descripcion'),
  fechaInicio: text('fecha_inicio').notNull(),
  fechaFin: text('fecha_fin'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Proyecto = typeof proyectos.$inferSelect;
export type ProyectoNuevo = typeof proyectos.$inferInsert;

export const estimacionesPerfil = sqliteTable(
  'estimaciones_perfil',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    proyectoId: integer('proyecto_id')
      .notNull()
      .references(() => proyectos.id, { onDelete: 'cascade' }),
    perfilTecnicoId: integer('perfil_tecnico_id')
      .notNull()
      .references(() => perfilesTecnicos.id, { onDelete: 'restrict' }),
    horasEstimadas: real('horas_estimadas').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    proyectoPerfilUnique: uniqueIndex(
      'estimaciones_proyecto_perfil_unique',
    ).on(table.proyectoId, table.perfilTecnicoId),
  }),
);

export type EstimacionPerfil = typeof estimacionesPerfil.$inferSelect;
export type EstimacionPerfilNueva = typeof estimacionesPerfil.$inferInsert;

export const pedidos = sqliteTable('pedidos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  proyectoId: integer('proyecto_id')
    .notNull()
    .references(() => proyectos.id, { onDelete: 'restrict' }),
  proveedorId: integer('proveedor_id')
    .notNull()
    .references(() => proveedores.id, { onDelete: 'restrict' }),
  estado: text('estado', { enum: ESTADOS_PEDIDO })
    .notNull()
    .default('Borrador'),
  fechaSolicitud: text('fecha_solicitud'),
  fechaAprobacion: text('fecha_aprobacion'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Pedido = typeof pedidos.$inferSelect;
export type PedidoNuevo = typeof pedidos.$inferInsert;

export const lineasPedido = sqliteTable('lineas_pedido', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pedidoId: integer('pedido_id')
    .notNull()
    .references(() => pedidos.id, { onDelete: 'cascade' }),
  perfilTecnicoId: integer('perfil_tecnico_id')
    .notNull()
    .references(() => perfilesTecnicos.id, { onDelete: 'restrict' }),
  fechaInicio: text('fecha_inicio').notNull(),
  fechaFin: text('fecha_fin').notNull(),
  horasOfertadas: real('horas_ofertadas').notNull(),
  precioHora: real('precio_hora').notNull(),
  tarifaCongelada: integer('tarifa_congelada', { mode: 'boolean' })
    .notNull()
    .default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type LineaPedido = typeof lineasPedido.$inferSelect;
export type LineaPedidoNueva = typeof lineasPedido.$inferInsert;

export const ACCIONES_HISTORIAL_PEDIDO = [
  'solicitar',
  'aprobar',
  'rechazar',
  'cancelar',
  'consumo_inicial',
  'consumo_completo',
  'consumo_borrado',
] as const;

export type AccionHistorialPedido = (typeof ACCIONES_HISTORIAL_PEDIDO)[number];

export const historialPedido = sqliteTable('historial_pedido', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pedidoId: integer('pedido_id')
    .notNull()
    .references(() => pedidos.id, { onDelete: 'cascade' }),
  estadoAnterior: text('estado_anterior', { enum: ESTADOS_PEDIDO }).notNull(),
  estadoNuevo: text('estado_nuevo', { enum: ESTADOS_PEDIDO }).notNull(),
  accion: text('accion', { enum: ACCIONES_HISTORIAL_PEDIDO }).notNull(),
  usuarioId: integer('usuario_id').references(() => usuarios.id, {
    onDelete: 'set null',
  }),
  fecha: text('fecha')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  // true cuando la fila se reconstruyó best-effort a partir de
  // fechaSolicitud / fechaAprobacion / updatedAt (migración 0008 sobre
  // pedidos pre-#16, o seed sintético). false para entradas escritas por
  // PedidosService.transitar() o ConsumosService a partir de un evento
  // real con usuarioId conocido.
  reconstruido: integer('reconstruido', { mode: 'boolean' })
    .notNull()
    .default(false),
});

export type HistorialPedido = typeof historialPedido.$inferSelect;
export type HistorialPedidoNuevo = typeof historialPedido.$inferInsert;

export const consumosMensuales = sqliteTable(
  'consumos_mensuales',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    lineaPedidoId: integer('linea_pedido_id')
      .notNull()
      .references(() => lineasPedido.id, { onDelete: 'cascade' }),
    recursoId: integer('recurso_id')
      .notNull()
      .references(() => recursos.id, { onDelete: 'restrict' }),
    usuarioId: integer('usuario_id').references(() => usuarios.id, {
      onDelete: 'set null',
    }),
    mes: integer('mes').notNull(),
    anio: integer('anio').notNull(),
    horasConsumidas: real('horas_consumidas').notNull(),
    fechaRegistro: text('fecha_registro')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    lineaRecursoMesAnioUnique: uniqueIndex(
      'consumos_linea_recurso_mes_anio_unique',
    ).on(table.lineaPedidoId, table.recursoId, table.mes, table.anio),
  }),
);

export type ConsumoMensual = typeof consumosMensuales.$inferSelect;
export type ConsumoMensualNuevo = typeof consumosMensuales.$inferInsert;
