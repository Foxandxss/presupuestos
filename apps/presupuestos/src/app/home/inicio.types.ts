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

export type TipoActividad =
  | 'pedido_creado'
  | 'pedido_solicitado'
  | 'pedido_aprobado'
  | 'pedido_actualizado'
  | 'consumo_registrado';

export interface ActividadEvento {
  tipo: TipoActividad;
  fecha: string;
  descripcion: string;
  recurso: { tipo: 'pedido' | 'consumo' | 'proyecto'; id: number };
}
