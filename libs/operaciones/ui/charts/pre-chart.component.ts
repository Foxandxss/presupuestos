import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';

export type PreChartTipo = 'doughnut' | 'bar' | 'line' | 'pie';

@Component({
  selector: 'pre-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChartModule],
  template: `
    <div class="pre-chart" [style.height.px]="alto()">
      @if (sinDatos()) {
        <p class="pre-chart__vacio">{{ mensajeVacio() }}</p>
      } @else {
        <p-chart
          [type]="tipo()"
          [data]="data()"
          [options]="opciones()"
          [responsive]="true"
          [ariaLabel]="ariaLabel() ?? undefined"
        ></p-chart>
      }
    </div>
  `,
  styles: [
    `
      .pre-chart {
        position: relative;
        width: 100%;
        background-color: var(--surface-card);
      }
      .pre-chart__vacio {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        font-size: 13px;
        color: var(--text-subtle);
      }
    `,
  ],
})
export class PreChartComponent {
  readonly tipo = input.required<PreChartTipo>();
  readonly data = input.required<ChartData>();
  readonly opciones = input.required<ChartOptions>();
  readonly alto = input<number>(280);
  readonly ariaLabel = input<string | null>(null);
  readonly mensajeVacio = input<string>('Sin datos para mostrar.');

  protected readonly sinDatos = computed(() => {
    const datasets = this.data().datasets ?? [];
    if (datasets.length === 0) return true;
    return datasets.every((d) => {
      const data = d.data ?? [];
      return (
        data.length === 0 ||
        data.every((v) => v === null || v === undefined || v === 0)
      );
    });
  });
}
