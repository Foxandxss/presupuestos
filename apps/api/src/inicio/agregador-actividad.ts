// Deep module: union cronológica de eventos del sistema. Recibe arrays
// hidratados de pedidos + consumos + historial_pedido + proyectos y emite un
// feed plano ordenado por fecha desc, opcionalmente filtrado y paginado.
//
// Slice 2 de #20: las transiciones de pedido pasan a leerse de
// historial_pedido (#16) en lugar de aproximarse con
// fechaSolicitud/fechaAprobacion/updatedAt. Las acciones manuales
// (solicitar/aprobar/rechazar/cancelar) se consolidan en `pedido_transicion`
// con la sub-acción en el campo `accion`. Las auto-transiciones
// `consumo_inicial` / `consumo_completo` se omiten del feed (son
// redundantes con el evento `consumo_registrado` que las causa); la
// auto-transición `consumo_borrado` se expone como `consumo_eliminado`
// (única huella persistente del borrado, ya que consumos se hace hard
// delete sobre la fila).

import type { AccionHistorialPedido } from '../db/schema';

export interface PedidoParaActividad {
  id: number;
  proyectoNombre: string;
  proveedorNombre: string;
  createdAt: string;
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
  usuarioId: number | null;
  usuarioEmail: string | null;
}

// Fila histórica con metadatos del pedido + email del usuario actor (join).
// El agregador filtra por accion para decidir si emite pedido_transicion o
// consumo_eliminado o si lo descarta (consumo_inicial/consumo_completo).
export interface HistorialParaActividad {
  pedidoId: number;
  proyectoNombre: string;
  proveedorNombre: string;
  estadoAnterior: string;
  estadoNuevo: string;
  accion: AccionHistorialPedido;
  fecha: string;
  usuarioId: number | null;
  usuarioEmail: string | null;
}

export interface ProyectoParaActividad {
  id: number;
  nombre: string;
  createdAt: string;
}

export const TIPOS_ACTIVIDAD = [
  'pedido_creado',
  'pedido_transicion',
  'consumo_registrado',
  'consumo_eliminado',
  'proyecto_creado',
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export interface EventoActividadRecurso {
  tipo: 'pedido' | 'consumo' | 'proyecto';
  id: number;
}

export interface EventoActividad {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  recurso: EventoActividadRecurso;
  // Sub-acción presente sólo cuando viene de historial_pedido
  // (pedido_transicion / consumo_eliminado). Para los demás tipos es null.
  accion: AccionHistorialPedido | null;
  // usuarioId actor del evento. null cuando no se conoce: pedido_creado y
  // proyecto_creado nunca lo guardan (no hay columna), historial puede
  // tener filas reconstruidas con usuarioId=null, y consumo_registrado
  // puede tener usuarioId=null si el usuario actor fue soft-deleted.
  usuarioId: number | null;
  usuarioEmail: string | null;
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
  // caller frontend construye el rango como prefiera (típicamente
  // 'YYYY-MM-DDT23:59:59.999Z').
  hasta?: string;
  // Substring case-insensitive sobre la descripción del evento.
  q?: string;
  usuarioId?: number;
  pedidoId?: number;
  proyectoId?: number;
}

export interface ActividadPagina {
  total: number;
  items: EventoActividad[];
}

const ACCIONES_PEDIDO_TRANSICION = new Set<AccionHistorialPedido>([
  'solicitar',
  'aprobar',
  'rechazar',
  'cancelar',
]);

export const AgregadorActividad = {
  agregar(
    pedidos: PedidoParaActividad[],
    consumos: ConsumoParaActividad[],
    historial: HistorialParaActividad[],
    proyectos: ProyectoParaActividad[],
    opts: ActividadFiltros = {},
  ): ActividadPagina {
    const eventos: EventoActividad[] = [];

    for (const p of pedidos) {
      eventos.push({
        tipo: 'pedido_creado',
        fecha: p.createdAt,
        descripcion: `Pedido #${p.id} creado en ${p.proyectoNombre} (${p.proveedorNombre}).`,
        recurso: { tipo: 'pedido', id: p.id },
        accion: null,
        usuarioId: null,
        usuarioEmail: null,
      });
    }

    for (const proy of proyectos) {
      eventos.push({
        tipo: 'proyecto_creado',
        fecha: proy.createdAt,
        descripcion: `Proyecto ${proy.nombre} creado.`,
        recurso: { tipo: 'proyecto', id: proy.id },
        accion: null,
        usuarioId: null,
        usuarioEmail: null,
      });
    }

    for (const h of historial) {
      if (ACCIONES_PEDIDO_TRANSICION.has(h.accion)) {
        eventos.push({
          tipo: 'pedido_transicion',
          fecha: h.fecha,
          descripcion: `Pedido #${h.pedidoId} ${verboTransicion(h.accion)}.`,
          recurso: { tipo: 'pedido', id: h.pedidoId },
          accion: h.accion,
          usuarioId: h.usuarioId,
          usuarioEmail: h.usuarioEmail,
        });
      } else if (h.accion === 'consumo_borrado') {
        eventos.push({
          tipo: 'consumo_eliminado',
          fecha: h.fecha,
          descripcion: `Consumo eliminado del pedido #${h.pedidoId} (${h.proyectoNombre}).`,
          recurso: { tipo: 'pedido', id: h.pedidoId },
          accion: h.accion,
          usuarioId: h.usuarioId,
          usuarioEmail: h.usuarioEmail,
        });
      }
      // consumo_inicial / consumo_completo se omiten: redundantes con el
      // consumo_registrado correspondiente.
    }

    for (const c of consumos) {
      const horas = c.horasConsumidas.toFixed(2).replace('.', ',');
      eventos.push({
        tipo: 'consumo_registrado',
        fecha: c.createdAt,
        descripcion: `Consumo de ${horas} h registrado en pedido #${c.pedidoId} (${c.recursoNombre}).`,
        recurso: { tipo: 'consumo', id: c.id },
        accion: null,
        usuarioId: c.usuarioId,
        usuarioEmail: c.usuarioEmail,
      });
    }

    eventos.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const tiposSet =
      opts.tipo && opts.tipo.length > 0 ? new Set(opts.tipo) : null;
    const qLower = opts.q ? opts.q.trim().toLowerCase() : null;
    const filtrados = eventos.filter((e) => {
      if (tiposSet && !tiposSet.has(e.tipo)) return false;
      if (opts.desde && e.fecha < opts.desde) return false;
      if (opts.hasta && e.fecha > opts.hasta) return false;
      if (qLower && !e.descripcion.toLowerCase().includes(qLower)) return false;
      if (opts.usuarioId !== undefined && e.usuarioId !== opts.usuarioId)
        return false;
      if (opts.pedidoId !== undefined) {
        if (e.recurso.tipo !== 'pedido' || e.recurso.id !== opts.pedidoId)
          return false;
      }
      // proyectoId: filtra eventos cuyo proyecto coincide. Sólo aplicable
      // a proyecto_creado (recurso.id === proyectoId) y a pedido_creado
      // cuando el descriptor lleva el proyecto, pero como no llevamos el
      // proyectoId en EventoActividad lo dejamos limitado al recurso
      // proyecto. (Para una v2: añadir proyectoId al evento.)
      if (opts.proyectoId !== undefined) {
        if (e.recurso.tipo !== 'proyecto' || e.recurso.id !== opts.proyectoId)
          return false;
      }
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

function verboTransicion(accion: AccionHistorialPedido): string {
  switch (accion) {
    case 'solicitar':
      return 'solicitado';
    case 'aprobar':
      return 'aprobado';
    case 'rechazar':
      return 'rechazado';
    case 'cancelar':
      return 'cancelado';
    default:
      return accion;
  }
}
