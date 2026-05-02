import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import type { EstadoPedido } from '../../dominio';

import { etiquetaEstadoPedido } from './display-label';
import { formatearFechaCorta } from './fechas';

const HAPPY_PATH: readonly EstadoPedido[] = [
  'Borrador',
  'Solicitado',
  'Aprobado',
  'EnEjecucion',
  'Consumido',
] as const;

const ESTADOS_TERMINALES_NEGATIVOS: ReadonlySet<EstadoPedido> = new Set([
  'Rechazado',
  'Cancelado',
]);

interface NodoTimeline {
  estado: EstadoPedido;
  etiqueta: string;
  fecha: string | null;
  estadoNodo: 'pasado' | 'actual' | 'futuro';
}

interface CardTerminal {
  /** "Cancelado" / "Rechazado" — etiqueta del estado terminal. */
  accionTerminal: string;
  /** Fecha legible o null si no se conoce. */
  fecha: string | null;
  /** Estado desde el que se transitó al terminal. */
  estadoPrevio: string;
}

/**
 * Línea de tiempo del Pedido. Renderiza:
 * - Stepper happy-path (5 nodos) cuando el estado pertenece al camino feliz.
 * - Card terminal cuando es Rechazado/Cancelado con copy
 *   "[acción] el [fecha] desde [estado]".
 *
 * Las fechas exactas en cada nodo provienen de los inputs `fechaSolicitud`,
 * `fechaAprobacion`, `fechaEnEjecucion` y `fechaConsumido`. La detail page
 * los deriva de `pedido.historial` (issue #16): primer `consumo_inicial`
 * para EnEjecucion, primer `consumo_completo` para Consumido. Si el pedido
 * no tiene la entrada correspondiente (porque está en un estado anterior o
 * porque pre-#16 no se registró), el input es null y la fecha del nodo se
 * omite.
 */
@Component({
  selector: 'pre-status-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (terminalNegativo()) {
      <div
        class="pre-timeline-terminal"
        [attr.data-estado]="estado()"
        role="status"
      >
        <div class="pre-timeline-terminal__titulo">
          {{ cardTerminal().accionTerminal }}
          @if (cardTerminal().fecha) {
            el {{ cardTerminal().fecha }}
          }
          desde {{ cardTerminal().estadoPrevio }}
        </div>
      </div>
    } @else {
      <ol class="pre-timeline" role="list">
        @for (nodo of nodos(); track nodo.estado) {
          <li
            class="pre-timeline__nodo"
            [attr.data-estado]="nodo.estado"
            [attr.data-estado-nodo]="nodo.estadoNodo"
            [attr.aria-current]="nodo.estadoNodo === 'actual' ? 'step' : null"
          >
            <span class="pre-timeline__circulo" aria-hidden="true"></span>
            <span class="pre-timeline__etiqueta">{{ nodo.etiqueta }}</span>
            @if (nodo.fecha) {
              <span class="pre-timeline__fecha">{{ nodo.fecha }}</span>
            }
          </li>
        }
      </ol>
    }
  `,
  styleUrl: './status-timeline.component.css',
})
export class StatusTimelineComponent {
  readonly estado = input.required<EstadoPedido>();
  readonly fechaSolicitud = input<string | null>(null);
  readonly fechaAprobacion = input<string | null>(null);
  readonly fechaEnEjecucion = input<string | null>(null);
  readonly fechaConsumido = input<string | null>(null);

  /**
   * Fecha del cambio a estado terminal (Rechazado/Cancelado). Sólo se
   * usa cuando `estado` es terminal. La detail page la deriva del
   * historial (entrada cuyo estadoNuevo es el terminal); cae a
   * `pedido.updatedAt` para pedidos pre-#16 sin entrada registrada.
   */
  readonly fechaTerminacion = input<string | null>(null);

  /**
   * Estado desde el que se transitó al terminal. Si no se proporciona,
   * inferimos: Rechazado → Solicitado, Cancelado → Aprobado. La inferencia
   * para Cancelado es aproximada (puede haber sido EnEjecucion); con la
   * entrada de historial real es exacta.
   */
  readonly estadoPrevioTerminal = input<EstadoPedido | null>(null);

  protected readonly terminalNegativo = computed(() =>
    ESTADOS_TERMINALES_NEGATIVOS.has(this.estado()),
  );

  protected readonly nodos = computed<NodoTimeline[]>(() => {
    const estadoActual = this.estado();
    const indiceActual = HAPPY_PATH.indexOf(estadoActual);
    const fechaSolicitud = formatearFechaCorta(this.fechaSolicitud());
    const fechaAprobacion = formatearFechaCorta(this.fechaAprobacion());
    const fechaEnEjecucion = formatearFechaCorta(this.fechaEnEjecucion());
    const fechaConsumido = formatearFechaCorta(this.fechaConsumido());

    return HAPPY_PATH.map((estado, indice) => ({
      estado,
      etiqueta: etiquetaEstadoPedido(estado),
      fecha:
        estado === 'Solicitado'
          ? fechaSolicitud
          : estado === 'Aprobado'
            ? fechaAprobacion
            : estado === 'EnEjecucion'
              ? fechaEnEjecucion
              : estado === 'Consumido'
                ? fechaConsumido
                : null,
      estadoNodo:
        indice < indiceActual
          ? 'pasado'
          : indice === indiceActual
            ? 'actual'
            : 'futuro',
    }));
  });

  protected readonly cardTerminal = computed<CardTerminal>(() => {
    const estado = this.estado();
    const previoExplicito = this.estadoPrevioTerminal();
    const previoInferido: EstadoPedido =
      estado === 'Rechazado' ? 'Solicitado' : 'Aprobado';
    const estadoPrevio = previoExplicito ?? previoInferido;
    return {
      accionTerminal: etiquetaEstadoPedido(estado),
      fecha: formatearFechaCorta(this.fechaTerminacion()),
      estadoPrevio: etiquetaEstadoPedido(estadoPrevio),
    };
  });
}
