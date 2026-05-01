// Deep module: impone los invariantes de un ConsumoMensual propuesto antes de
// que llegue a la base de datos. Los servicios sólo construyen el contexto
// (cargando lo que haga falta de Drizzle) e invocan `validar`; los errores
// específicos viajan hasta el controller vía DomainError + ExceptionFilter.

import { DomainError } from '@operaciones/dominio';
import type { EstadoPedido } from '../db/schema';

export const MOTIVOS_VALIDACION_CONSUMO = [
  'pedido_no_activo',
  'recurso_otro_proveedor',
  'mes_fuera_de_ventana',
  'consumo_duplicado',
  'excede_horas_ofertadas',
] as const;

export type MotivoValidacionConsumo =
  (typeof MOTIVOS_VALIDACION_CONSUMO)[number];

export class ValidacionConsumoError extends DomainError {
  constructor(
    public readonly motivo: MotivoValidacionConsumo,
    message: string,
    fields?: Record<string, unknown>,
  ) {
    super(motivo, message, fields);
    this.name = 'ValidacionConsumoError';
  }
}

export interface PropuestaConsumo {
  mes: number;
  anio: number;
  horas: number;
}

export interface ContextoValidacionConsumo {
  estadoPedido: EstadoPedido;
  proveedorIdPedido: number;
  proveedorIdRecurso: number;
  fechaInicioLinea: string;
  fechaFinLinea: string;
  horasOfertadasLinea: number;
  horasYaConsumidasLinea: number;
  duplicado: boolean;
}

export const ValidadorConsumo = {
  /**
   * Lanza ValidacionConsumoError con el primer motivo que falle. El orden de
   * comprobación es deliberado: estado → recurso → ventana → duplicado →
   * overflow, para que el mensaje sea el más informativo posible.
   */
  validar(propuesta: PropuestaConsumo, ctx: ContextoValidacionConsumo): void {
    if (ctx.estadoPedido !== 'Aprobado' && ctx.estadoPedido !== 'EnEjecucion') {
      throw new ValidacionConsumoError(
        'pedido_no_activo',
        `No se puede registrar consumo contra un pedido en estado '${ctx.estadoPedido}'`,
      );
    }
    if (ctx.proveedorIdRecurso !== ctx.proveedorIdPedido) {
      throw new ValidacionConsumoError(
        'recurso_otro_proveedor',
        'El recurso seleccionado no pertenece al proveedor del pedido',
      );
    }
    if (!enVentana(propuesta, ctx.fechaInicioLinea, ctx.fechaFinLinea)) {
      throw new ValidacionConsumoError(
        'mes_fuera_de_ventana',
        `El mes ${pad(propuesta.mes)}/${propuesta.anio} cae fuera de la ventana de la línea (${ctx.fechaInicioLinea} → ${ctx.fechaFinLinea})`,
      );
    }
    if (ctx.duplicado) {
      throw new ValidacionConsumoError(
        'consumo_duplicado',
        `Ya existe un consumo registrado para esa combinación de línea, recurso, mes y año`,
      );
    }
    const total = ctx.horasYaConsumidasLinea + propuesta.horas;
    if (total > ctx.horasOfertadasLinea) {
      const disponibles = Math.max(
        0,
        ctx.horasOfertadasLinea - ctx.horasYaConsumidasLinea,
      );
      throw new ValidacionConsumoError(
        'excede_horas_ofertadas',
        `Las horas registradas (${total}) exceden las ofertadas (${ctx.horasOfertadasLinea}). Restantes: ${disponibles}`,
        { disponibles },
      );
    }
  },
};

function enVentana(
  propuesta: PropuestaConsumo,
  fechaInicio: string,
  fechaFin: string,
): boolean {
  const propuestaIdx = propuesta.anio * 12 + (propuesta.mes - 1);
  const inicioIdx = mesAnioIndex(fechaInicio);
  const finIdx = mesAnioIndex(fechaFin);
  return propuestaIdx >= inicioIdx && propuestaIdx <= finIdx;
}

function mesAnioIndex(fechaIso: string): number {
  const [yyyy, mm] = fechaIso.split('-');
  return Number(yyyy) * 12 + (Number(mm) - 1);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
