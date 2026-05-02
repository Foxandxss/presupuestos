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
  'pedido_solicitado',
  'pedido_aprobado',
  'pedido_actualizado',
  'consumo_registrado',
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export interface ActividadEvento {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  recurso: { tipo: 'pedido' | 'consumo' | 'proyecto'; id: number };
}

export interface ActividadFiltros {
  limit?: number;
  offset?: number;
  tipo?: readonly TipoActividad[];
  desde?: string;
  hasta?: string;
}

export interface ActividadPagina {
  total: number;
  items: ActividadEvento[];
}
