export type EstadoPedido =
  | 'Borrador'
  | 'Solicitado'
  | 'Aprobado'
  | 'EnEjecucion'
  | 'Consumido'
  | 'Rechazado'
  | 'Cancelado';

export type AccionPedido = 'solicitar' | 'aprobar' | 'rechazar' | 'cancelar';

export type AccionHistorialPedido =
  | AccionPedido
  | 'consumo_inicial'
  | 'consumo_completo'
  | 'consumo_borrado';

export interface HistorialPedido {
  id: number;
  estadoAnterior: EstadoPedido;
  estadoNuevo: EstadoPedido;
  accion: AccionHistorialPedido;
  usuarioId: number | null;
  fecha: string;
  reconstruido: boolean;
}

export interface LineaPedido {
  id: number;
  pedidoId: number;
  perfilTecnicoId: number;
  fechaInicio: string;
  fechaFin: string;
  horasOfertadas: number;
  precioHora: number;
  tarifaCongelada: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pedido {
  id: number;
  proyectoId: number;
  proveedorId: number;
  estado: EstadoPedido;
  fechaSolicitud: string | null;
  fechaAprobacion: string | null;
  lineas: LineaPedido[];
  historial: HistorialPedido[];
  createdAt: string;
  updatedAt: string;
}

export interface CrearLineaPedido {
  perfilTecnicoId: number;
  fechaInicio: string;
  fechaFin: string;
  horasOfertadas: number;
  precioHora?: number;
}

export interface CrearPedido {
  proyectoId: number;
  proveedorId: number;
  lineas?: CrearLineaPedido[];
}
