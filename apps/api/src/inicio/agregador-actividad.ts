// Deep module: union cronológica de eventos del sistema. Recibe arrays
// hidratados de pedidos + consumos y emite un feed plano ordenado por
// fecha desc, opcionalmente filtrado y paginado.
//
// Las transiciones de pedido se aproximan con fechaSolicitud /
// fechaAprobacion / updatedAt — slice 2 de #20 conectará historial_pedido
// (#16) como fuente real.

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

export const TIPOS_ACTIVIDAD = [
  'pedido_creado',
  'pedido_solicitado',
  'pedido_aprobado',
  'pedido_actualizado',
  'consumo_registrado',
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export interface EventoActividad {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  recurso: { tipo: 'pedido' | 'consumo' | 'proyecto'; id: number };
}

export interface ActividadFiltros {
  limit?: number;
  offset?: number;
  tipo?: readonly TipoActividad[];
  // ISO date — inclusive. Se compara lexicográficamente contra fecha del
  // evento (también ISO), así que un valor 'YYYY-MM-DD' filtra desde el
  // inicio del día UTC.
  desde?: string;
  // ISO date — inclusive en el sentido "hasta el final de ese día". El
  // caller puede pasar 'YYYY-MM-DD' (que en la comparación lexicográfica
  // contra timestamps 'YYYY-MM-DDTHH:MM:SSZ' equivale a "antes del inicio
  // del día"); para evitar confusiones, el filtro acepta el valor crudo
  // y deja que el frontend construya el rango como prefiera. Para "todo
  // el día N", pasar hasta como 'N+1' o 'NT23:59:59Z'.
  hasta?: string;
}

export interface ActividadPagina {
  total: number;
  items: EventoActividad[];
}

const ESTADOS_TERMINALES = new Set(['Rechazado', 'Cancelado', 'Consumido']);

export const AgregadorActividad = {
  agregar(
    pedidos: PedidoParaActividad[],
    consumos: ConsumoParaActividad[],
    opts: ActividadFiltros = {},
  ): ActividadPagina {
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

    const tiposSet =
      opts.tipo && opts.tipo.length > 0 ? new Set(opts.tipo) : null;
    const filtrados = eventos.filter((e) => {
      if (tiposSet && !tiposSet.has(e.tipo)) return false;
      if (opts.desde && e.fecha < opts.desde) return false;
      if (opts.hasta && e.fecha > opts.hasta) return false;
      return true;
    });

    const offset = Math.max(0, opts.offset ?? 0);
    const limit = Math.max(0, opts.limit ?? 10);
    return {
      total: filtrados.length,
      items: filtrados.slice(offset, offset + limit),
    };
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
