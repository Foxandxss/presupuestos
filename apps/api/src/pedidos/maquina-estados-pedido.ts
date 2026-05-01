// Deep module: orquesta las transiciones legales del Pedido y los side effects
// (congelar tarifas al aprobar, auto-transiciones por consumo). El servicio sólo
// llama a estas funciones puras y aplica los cambios resultantes.

import { DomainError } from '@operaciones/dominio';
import type { EstadoPedido } from '../db/schema';

export const ACCIONES_PEDIDO = [
  'solicitar',
  'aprobar',
  'rechazar',
  'cancelar',
] as const;

export type AccionPedido = (typeof ACCIONES_PEDIDO)[number];

const TRANSICIONES_LEGALES: Record<
  EstadoPedido,
  Partial<Record<AccionPedido, EstadoPedido>>
> = {
  Borrador: { solicitar: 'Solicitado' },
  Solicitado: { aprobar: 'Aprobado', rechazar: 'Rechazado' },
  Aprobado: { cancelar: 'Cancelado' },
  EnEjecucion: { cancelar: 'Cancelado' },
  Consumido: {},
  Rechazado: {},
  Cancelado: {},
};

export class TransicionIlegalError extends DomainError {
  constructor(
    public readonly estado: EstadoPedido,
    public readonly accion: AccionPedido | 'consumir',
  ) {
    super(
      'transicion_ilegal',
      `No se puede '${accion}' un pedido en estado '${estado}'`,
      { estado, accion },
    );
    this.name = 'TransicionIlegalError';
  }
}

export interface LineaConsumo {
  horasOfertadas: number;
  horasConsumidas: number;
}

export const MaquinaEstadosPedido = {
  /**
   * Aplica una acción manual y devuelve el nuevo estado. Lanza
   * TransicionIlegalError cuando la combinación (estado, acción) no está
   * permitida.
   */
  aplicar(estado: EstadoPedido, accion: AccionPedido): EstadoPedido {
    const siguiente = TRANSICIONES_LEGALES[estado]?.[accion];
    if (!siguiente) {
      throw new TransicionIlegalError(estado, accion);
    }
    return siguiente;
  },

  /**
   * Estado tras registrar un consumo válido. Sólo es válido sobre pedidos
   * Aprobado o EnEjecucion; cualquier otro estado lanza.
   */
  estadoTrasConsumo(
    estadoActual: EstadoPedido,
    lineas: LineaConsumo[],
  ): EstadoPedido {
    if (estadoActual === 'Aprobado') {
      return MaquinaEstadosPedido.completaSiAplica('EnEjecucion', lineas);
    }
    if (estadoActual === 'EnEjecucion') {
      return MaquinaEstadosPedido.completaSiAplica('EnEjecucion', lineas);
    }
    throw new TransicionIlegalError(estadoActual, 'consumir');
  },

  /**
   * Si todas las líneas tienen horasConsumidas >= horasOfertadas, devuelve
   * 'Consumido'. En caso contrario o si no hay líneas, conserva el estado.
   */
  completaSiAplica(
    estadoActual: EstadoPedido,
    lineas: LineaConsumo[],
  ): EstadoPedido {
    if (estadoActual !== 'EnEjecucion') {
      return estadoActual;
    }
    if (lineas.length === 0) {
      return estadoActual;
    }
    const completo = lineas.every(
      (l) => l.horasConsumidas >= l.horasOfertadas,
    );
    return completo ? 'Consumido' : estadoActual;
  },

  /**
   * Recalcula el estado de un pedido tras borrar un consumo. Sólo opera
   * sobre estados accesibles por consumo (EnEjecucion, Consumido) y los
   * regresa cuando los consumos restantes ya no justifican el estado:
   * - Si no quedan consumos en ninguna línea → 'Aprobado'.
   * - Si todas las líneas siguen agotadas → 'Consumido'.
   * - En cualquier otro caso → 'EnEjecucion'.
   * Estados manuales (Borrador/Solicitado/Rechazado/Cancelado) y pedidos
   * sin líneas conservan su estado.
   */
  recalcularTrasBorrar(
    estadoActual: EstadoPedido,
    lineas: LineaConsumo[],
  ): EstadoPedido {
    if (estadoActual !== 'EnEjecucion' && estadoActual !== 'Consumido') {
      return estadoActual;
    }
    if (lineas.length === 0) {
      return estadoActual;
    }
    const sinConsumos = lineas.every((l) => l.horasConsumidas === 0);
    if (sinConsumos) {
      return 'Aprobado';
    }
    const completo = lineas.every(
      (l) => l.horasConsumidas >= l.horasOfertadas,
    );
    if (completo) {
      return 'Consumido';
    }
    return 'EnEjecucion';
  },
};
