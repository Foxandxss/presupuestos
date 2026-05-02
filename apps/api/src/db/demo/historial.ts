import type { AppDatabase } from '../connection';
import { historialPedido, pedidos, type EstadoPedido } from '../schema';

// Reconstruye el audit log de transiciones para los Pedidos sembrados. El
// seeder bypassa PedidosService.transitar() y ConsumosService.create()
// (escribe directamente con db.update/insert para fijar IDs y fechas
// reproducibles), asi que ninguna entrada de historial llega a escribirse
// por la via real. Esta funcion lo arregla con la misma logica que la
// migracion 0008: una entrada por cada cambio de estado deducible de
// fechaSolicitud, fechaAprobacion y updatedAt, marcada reconstruido=true.
export function sembrarHistorialReconstruido(db: AppDatabase): void {
  const filas = db.select().from(pedidos).all();
  for (const p of filas) {
    if (p.fechaSolicitud) {
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'Borrador',
        estadoNuevo: 'Solicitado',
        accion: 'solicitar',
        fecha: p.fechaSolicitud,
      });
    }
    if (p.fechaAprobacion) {
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'Solicitado',
        estadoNuevo: 'Aprobado',
        accion: 'aprobar',
        fecha: p.fechaAprobacion,
      });
    }
    if (p.estado === 'Rechazado') {
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'Solicitado',
        estadoNuevo: 'Rechazado',
        accion: 'rechazar',
        fecha: p.updatedAt,
      });
    } else if (p.estado === 'Cancelado') {
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'Aprobado',
        estadoNuevo: 'Cancelado',
        accion: 'cancelar',
        fecha: p.updatedAt,
      });
    } else if (p.estado === 'EnEjecucion') {
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'Aprobado',
        estadoNuevo: 'EnEjecucion',
        accion: 'consumo_inicial',
        fecha: p.updatedAt,
      });
    } else if (p.estado === 'Consumido') {
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'Aprobado',
        estadoNuevo: 'EnEjecucion',
        accion: 'consumo_inicial',
        fecha: p.updatedAt,
      });
      insertar(db, {
        pedidoId: p.id,
        estadoAnterior: 'EnEjecucion',
        estadoNuevo: 'Consumido',
        accion: 'consumo_completo',
        fecha: p.updatedAt,
      });
    }
  }
}

function insertar(
  db: AppDatabase,
  args: {
    pedidoId: number;
    estadoAnterior: EstadoPedido;
    estadoNuevo: EstadoPedido;
    accion:
      | 'solicitar'
      | 'aprobar'
      | 'rechazar'
      | 'cancelar'
      | 'consumo_inicial'
      | 'consumo_completo';
    fecha: string;
  },
): void {
  db.insert(historialPedido)
    .values({
      pedidoId: args.pedidoId,
      estadoAnterior: args.estadoAnterior,
      estadoNuevo: args.estadoNuevo,
      accion: args.accion,
      usuarioId: null,
      fecha: args.fecha,
      reconstruido: true,
    })
    .run();
}
