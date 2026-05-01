export const CODIGOS_ERROR_DOMINIO = [
  'transicion_ilegal',
  'pedido_no_activo',
  'recurso_otro_proveedor',
  'mes_fuera_de_ventana',
  'consumo_duplicado',
  'excede_horas_ofertadas',
  'proyecto_con_pedidos',
] as const;

export type CodigoErrorDominio = (typeof CODIGOS_ERROR_DOMINIO)[number];

export interface RespuestaErrorDominio {
  code: CodigoErrorDominio | string;
  message: string;
  fields?: Record<string, unknown>;
}

export class DomainError extends Error {
  constructor(
    public readonly code: CodigoErrorDominio,
    message: string,
    public readonly fields?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
