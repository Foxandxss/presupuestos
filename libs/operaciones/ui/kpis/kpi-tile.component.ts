import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';

export interface PreKpiDelta {
  porcentaje: number;
  positivo: boolean;
  textoSecundario?: string;
}

@Component({
  selector: 'pre-kpi-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  template: `
    @if (href(); as link) {
      <a class="pre-kpi" [routerLink]="link" [attr.aria-label]="etiqueta()">
        <ng-container *ngTemplateOutlet="contenido"></ng-container>
      </a>
    } @else {
      <div class="pre-kpi pre-kpi--no-link" [attr.aria-label]="etiqueta()">
        <ng-container *ngTemplateOutlet="contenido"></ng-container>
      </div>
    }

    <ng-template #contenido>
      @if (icono(); as ic) {
        <span class="pre-kpi__icono">
          <lucide-angular [img]="ic" size="20" />
        </span>
      }
      <span class="pre-kpi__etiqueta">{{ etiqueta() }}</span>
      <span class="pre-kpi__valor">{{ valor() }}</span>
      @if (delta(); as d) {
        <span
          class="pre-kpi__delta"
          [class.pre-kpi__delta--positivo]="d.positivo"
          [class.pre-kpi__delta--negativo]="!d.positivo"
        >
          {{ signo() }}{{ d.porcentaje }}%
          @if (d.textoSecundario) {
            <span class="pre-kpi__delta-secundario">
              {{ d.textoSecundario }}
            </span>
          }
        </span>
      }
    </ng-template>
  `,
  styles: [
    `
      .pre-kpi {
        display: grid;
        grid-template-columns: 32px 1fr;
        grid-template-rows: auto auto auto;
        column-gap: 12px;
        row-gap: 4px;
        padding: 16px;
        background-color: var(--surface-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        text-decoration: none;
        color: inherit;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .pre-kpi:hover {
        border-color: var(--border-default);
        box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
      }
      .pre-kpi:focus-visible {
        outline: 2px solid var(--ring-focus);
        outline-offset: 2px;
      }
      .pre-kpi--no-link:hover {
        border-color: var(--border-subtle);
        box-shadow: none;
      }
      .pre-kpi__icono {
        grid-row: 1 / span 2;
        grid-column: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-sm);
        background-color: var(--surface-muted);
        color: var(--text-subtle);
      }
      .pre-kpi__etiqueta {
        grid-column: 2;
        font-size: 12px;
        color: var(--text-subtle);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 500;
      }
      .pre-kpi__valor {
        grid-column: 2;
        font-size: 22px;
        font-weight: 600;
        line-height: 28px;
        font-variant-numeric: tabular-nums;
        color: var(--text-default);
      }
      .pre-kpi__delta {
        grid-column: 2;
        font-size: 11px;
        font-weight: 500;
      }
      .pre-kpi__delta--positivo {
        color: #047857;
      }
      .pre-kpi__delta--negativo {
        color: #b91c1c;
      }
      .pre-kpi__delta-secundario {
        margin-left: 4px;
        color: var(--text-subtle);
        font-weight: 400;
      }
    `,
  ],
})
export class KpiTileComponent {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string>();
  readonly icono = input<LucideIconData | null>(null);
  readonly delta = input<PreKpiDelta | null>(null);
  readonly href = input<string | unknown[] | null>(null);

  protected readonly signo = computed(() => {
    const d = this.delta();
    if (!d) return '';
    return d.positivo ? '+' : '−';
  });
}
