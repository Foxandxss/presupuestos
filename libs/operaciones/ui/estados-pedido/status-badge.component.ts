import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import type { EstadoPedido } from '../../dominio';

import { etiquetaEstadoPedido } from './display-label';

export type StatusBadgeSize = 'sm' | 'md' | 'lg';

/**
 * Mapeo semántico EstadoPedido → CSS vars de tokens.css.
 *
 * Los terminales (Consumido, Cancelado) usan estilo outline en lugar de
 * fill para que listas con muchos pedidos cerrados no parezcan un parchís.
 */
const ESTILO_POR_ESTADO: Record<
  EstadoPedido,
  { bg: string; text: string; border: string }
> = {
  Borrador: {
    bg: 'var(--status-borrador-bg)',
    text: 'var(--status-borrador-text)',
    border: 'var(--status-borrador-border)',
  },
  Solicitado: {
    bg: 'var(--status-solicitado-bg)',
    text: 'var(--status-solicitado-text)',
    border: 'var(--status-solicitado-border)',
  },
  Aprobado: {
    bg: 'var(--status-aprobado-bg)',
    text: 'var(--status-aprobado-text)',
    border: 'var(--status-aprobado-border)',
  },
  EnEjecucion: {
    bg: 'var(--status-enejecucion-bg)',
    text: 'var(--status-enejecucion-text)',
    border: 'var(--status-enejecucion-border)',
  },
  Consumido: {
    bg: 'var(--status-consumido-bg)',
    text: 'var(--status-consumido-text)',
    border: 'var(--status-consumido-border)',
  },
  Rechazado: {
    bg: 'var(--status-rechazado-bg)',
    text: 'var(--status-rechazado-text)',
    border: 'var(--status-rechazado-border)',
  },
  Cancelado: {
    bg: 'var(--status-cancelado-bg)',
    text: 'var(--status-cancelado-text)',
    border: 'var(--status-cancelado-border)',
  },
};

const TAMANOS: Record<
  StatusBadgeSize,
  { padding: string; fontSize: string; lineHeight: string }
> = {
  sm: { padding: '2px 8px', fontSize: '11px', lineHeight: '16px' },
  md: { padding: '3px 10px', fontSize: '12px', lineHeight: '18px' },
  lg: { padding: '5px 14px', fontSize: '14px', lineHeight: '20px' },
};

@Component({
  selector: 'pre-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="pre-status-badge"
      [style.background-color]="estilo().bg"
      [style.color]="estilo().text"
      [style.border-color]="estilo().border"
      [style.padding]="dimensiones().padding"
      [style.font-size]="dimensiones().fontSize"
      [style.line-height]="dimensiones().lineHeight"
    >
      {{ etiqueta() }}
    </span>
  `,
  styles: [
    `
      .pre-status-badge {
        display: inline-flex;
        align-items: center;
        font-weight: 500;
        border-radius: var(--radius-full);
        border: 1px solid;
        white-space: nowrap;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  readonly estado = input.required<EstadoPedido>();
  readonly size = input<StatusBadgeSize>('md');

  protected readonly estilo = computed(() => ESTILO_POR_ESTADO[this.estado()]);
  protected readonly dimensiones = computed(() => TAMANOS[this.size()]);
  protected readonly etiqueta = computed(() =>
    etiquetaEstadoPedido(this.estado()),
  );
}
