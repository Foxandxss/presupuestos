export const ESTADOS_PEDIDO = [
  'Borrador',
  'Solicitado',
  'Aprobado',
  'EnEjecucion',
  'Consumido',
  'Rechazado',
  'Cancelado',
] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];
