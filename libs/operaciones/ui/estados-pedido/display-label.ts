import type { EstadoPedido } from '../../dominio';

/**
 * Etiqueta humana de un EstadoPedido en castellano.
 *
 * El dominio usa el case literal del enum (`EnEjecucion`); la UI
 * presenta siempre la versión legible ("En ejecución").
 */
const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  Borrador: 'Borrador',
  Solicitado: 'Solicitado',
  Aprobado: 'Aprobado',
  EnEjecucion: 'En ejecución',
  Consumido: 'Consumido',
  Rechazado: 'Rechazado',
  Cancelado: 'Cancelado',
};

export function etiquetaEstadoPedido(estado: EstadoPedido): string {
  return ETIQUETAS_ESTADO[estado];
}
