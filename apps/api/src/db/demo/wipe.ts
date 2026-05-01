import { sql } from 'drizzle-orm';

import type { AppDatabase } from '../connection';
import {
  consumosMensuales,
  estimacionesPerfil,
  lineasPedido,
  pedidos,
  perfilesTecnicos,
  proveedores,
  proyectos,
  recursos,
  servicios,
  usuarios,
} from '../schema';

const TABLAS_FK_SAFE = [
  consumosMensuales,
  lineasPedido,
  pedidos,
  estimacionesPerfil,
  proyectos,
  servicios,
  recursos,
  perfilesTecnicos,
  proveedores,
  usuarios,
];

const TABLAS_AUTOINCREMENT_NOMBRES = [
  'consumos_mensuales',
  'lineas_pedido',
  'pedidos',
  'estimaciones_perfil',
  'proyectos',
  'servicios',
  'recursos',
  'perfiles_tecnicos',
  'proveedores',
  'usuarios',
];

// Borra los datos de dominio dejando intactas `meta` y `__drizzle_migrations`.
// Resetea sqlite_sequence sólo para las tablas wipeadas, así re-ejecutar el
// seed produce los mismos IDs (1, 2, ...).
export function wipeDatos(db: AppDatabase): void {
  for (const tabla of TABLAS_FK_SAFE) {
    db.delete(tabla).run();
  }
  for (const nombre of TABLAS_AUTOINCREMENT_NOMBRES) {
    db.run(sql`DELETE FROM sqlite_sequence WHERE name = ${nombre}`);
  }
}
