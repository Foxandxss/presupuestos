import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';

import { ICONOS, type NombreIcono } from '../iconos';

export type VarianteEstadoVacio = 'primer-uso' | 'sin-resultados';

@Component({
  selector: 'pre-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="pre-empty-state" role="status">
      <lucide-angular
        [img]="icono()"
        size="32"
        class="pre-empty-state__icon"
      />
      <h2 class="pre-empty-state__title">{{ titulo() }}</h2>
      @if (descripcion(); as d) {
        <p class="pre-empty-state__description">{{ d }}</p>
      }
      <div class="pre-empty-state__action">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .pre-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 48px 24px;
        text-align: center;
        background-color: var(--surface-card);
        border: 1px dashed var(--border-default);
        border-radius: var(--radius-md);
      }
      .pre-empty-state__icon {
        color: var(--text-subtle);
        margin-bottom: 4px;
      }
      .pre-empty-state__title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-default);
        margin: 0;
      }
      .pre-empty-state__description {
        font-size: 13px;
        color: var(--text-subtle);
        max-width: 360px;
        margin: 0;
      }
      .pre-empty-state__action {
        margin-top: 12px;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly variante = input<VarianteEstadoVacio>('primer-uso');
  readonly titulo = input.required<string>();
  readonly descripcion = input<string | null>(null);
  readonly iconoNombre = input<NombreIcono | null>(null);

  protected readonly icono = computed<LucideIconData>(() => {
    const explicito = this.iconoNombre();
    if (explicito) return ICONOS[explicito] as LucideIconData;
    const porVariante: NombreIcono =
      this.variante() === 'sin-resultados' ? 'vacioFiltros' : 'vacio';
    return ICONOS[porVariante] as LucideIconData;
  });
}
