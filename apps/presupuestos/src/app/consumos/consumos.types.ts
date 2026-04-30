export interface Consumo {
  id: number;
  lineaPedidoId: number;
  pedidoId: number;
  recursoId: number;
  mes: number;
  anio: number;
  horasConsumidas: number;
  fechaRegistro: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrearConsumo {
  lineaPedidoId: number;
  recursoId: number;
  mes: number;
  anio: number;
  horasConsumidas: number;
}

export interface ConsumoFiltros {
  pedidoId?: number;
  lineaPedidoId?: number;
  recursoId?: number;
  mes?: number;
  anio?: number;
}
