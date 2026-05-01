// Deep module: union cronológica de eventos del sistema. Recibe arrays
// hidratados de pedidos + consumos y emite un feed plano ordenado por
// fecha desc. Como el schema actual no tiene historial_pedido (issue #16
// abierto), las transiciones se aproximan con fechaSolicitud /
// fechaAprobacion / updatedAt — basta para v1.

export interface PedidoParaActividad {
  id: number;
  estado: string;
  proyectoNombre: string;
  proveedorNombre: string;
  createdAt: string;
  updatedAt: string;
  fechaSolicitud: string | null;
  fechaAprobacion: string | null;
}

export interface ConsumoParaActividad {
  id: number;
  pedidoId: number;
  recursoNombre: string;
  proyectoNombre: string;
  mes: number;
  anio: number;
  horasConsumidas: number;
  createdAt: string;
}

export type TipoActividad =
  | 'pedido_creado'
  | 'pedido_solicitado'
  | 'pedido_aprobado'
  | 'pedido_actualizado'
  | 'consumo_registrado';

export interface EventoActividad {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  recurso: { tipo: 'pedido' | 'consumo' | 'proyecto'; id: number };
}

const ESTADOS_TERMINALES = new Set(['Rechazado', 'Cancelado', 'Consumido']);

export const AgregadorActividad = {
  agregar(
    pedidos: PedidoParaActividad[],
    consumos: ConsumoParaActividad[],
    limit = 10,
  ): EventoActividad[] {
    const eventos: EventoActividad[] = [];

    for (const p of pedidos) {
      eventos.push({
        tipo: 'pedido_creado',
        fecha: p.createdAt,
        descripcion: `Pedido #${p.id} creado en ${p.proyectoNombre} (${p.proveedorNombre}).`,
        recurso: { tipo: 'pedido', id: p.id },
      });
      if (p.fechaSolicitud) {
        eventos.push({
          tipo: 'pedido_solicitado',
          fecha: p.fechaSolicitud,
          descripcion: `Pedido #${p.id} solicitado.`,
          recurso: { tipo: 'pedido', id: p.id },
        });
      }
      if (p.fechaAprobacion) {
        eventos.push({
          tipo: 'pedido_aprobado',
          fecha: p.fechaAprobacion,
          descripcion: `Pedido #${p.id} aprobado.`,
          recurso: { tipo: 'pedido', id: p.id },
        });
      }
      // Si el estado actual es terminal y updatedAt no coincide con
      // createdAt/fechaSolicitud/fechaAprobacion, el último cambio fue la
      // entrada en ese estado terminal.
      if (
        ESTADOS_TERMINALES.has(p.estado) &&
        p.updatedAt !== p.createdAt &&
        p.updatedAt !== p.fechaSolicitud &&
        p.updatedAt !== p.fechaAprobacion
      ) {
        eventos.push({
          tipo: 'pedido_actualizado',
          fecha: p.updatedAt,
          descripcion: `Pedido #${p.id}: ${etiquetaEstado(p.estado)}.`,
          recurso: { tipo: 'pedido', id: p.id },
        });
      }
    }

    for (const c of consumos) {
      const horas = c.horasConsumidas.toFixed(2).replace('.', ',');
      eventos.push({
        tipo: 'consumo_registrado',
        fecha: c.createdAt,
        descripcion: `Consumo de ${horas} h registrado en pedido #${c.pedidoId} (${c.recursoNombre}).`,
        recurso: { tipo: 'consumo', id: c.id },
      });
    }

    eventos.sort((a, b) => b.fecha.localeCompare(a.fecha));
    return eventos.slice(0, limit);
  },
};

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case 'Rechazado':
      return 'rechazado';
    case 'Cancelado':
      return 'cancelado';
    case 'Consumido':
      return 'completado';
    default:
      return estado.toLowerCase();
  }
}
