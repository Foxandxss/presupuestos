export interface KpisAdmin {
  pendientesAprobacion: number;
  enEjecucion: number;
  facturacionMes: number;
  facturacionMesDelta: number | null;
  horasMesConsumidas: number;
}

export interface KpisConsultor {
  enEjecucion: number;
  consumosDelMes: number;
  lineasQueCierranEsteMes: number;
  misHorasConsumidasMes: number;
}

export const TIPOS_ACTIVIDAD = [
  'pedido_creado',
  'pedido_transicion',
  'consumo_registrado',
  'consumo_eliminado',
  'proyecto_creado',
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

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

export interface ActividadEvento {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  recurso: { tipo: 'pedido' | 'consumo' | 'proyecto'; id: number };
  accion: AccionHistorialPedido | null;
  usuarioId: number | null;
  usuarioEmail: string | null;
}

export interface ActividadFiltros {
  limit?: number;
  offset?: number;
  tipo?: readonly TipoActividad[];
  desde?: string;
  hasta?: string;
  q?: string;
  usuarioId?: number;
  pedidoId?: number;
  proyectoId?: number;
}

export interface ActividadPagina {
  total: number;
  items: ActividadEvento[];
}
