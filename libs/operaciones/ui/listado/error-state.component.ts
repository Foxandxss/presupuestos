import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';

import { ICONOS, type NombreIcono } from '../iconos';

@Component({
  selector: 'pre-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="pre-error-state" role="alert">
      <lucide-angular [img]="icono()" size="20" class="pre-error-state__icon" />
      <div class="pre-error-state__text">
        <p class="pre-error-state__title">{{ titulo() }}</p>
        @if (descripcion(); as d) {
          <p class="pre-error-state__description">{{ d }}</p>
        }
      </div>
      @if (mostrarAccion()) {
        <button
          type="button"
          class="pre-error-state__retry"
          (click)="reintentar.emit()"
        >
          {{ etiquetaAccion() }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .pre-error-state {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        border: 1px solid #fecaca;
        background-color: #fef2f2;
        border-radius: var(--radius-md);
        color: #991b1b;
      }
      .pre-error-state__icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
      .pre-error-state__text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .pre-error-state__title {
        font-size: 13px;
        font-weight: 600;
        margin: 0;
      }
      .pre-error-state__description {
        font-size: 12px;
        margin: 0;
        opacity: 0.85;
      }
      .pre-error-state__retry {
        flex-shrink: 0;
        padding: 6px 12px;
        border: 1px solid #b91c1c;
        background-color: transparent;
        color: #b91c1c;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        border-radius: var(--radius-sm);
        cursor: pointer;
      }
      .pre-error-state__retry:hover {
        background-color: #b91c1c;
        color: var(--text-inverse);
      }
      .pre-error-state__retry:focus-visible {
        outline: 2px solid var(--ring-focus);
        outline-offset: 2px;
      }
    `,
  ],
})
export class ErrorStateComponent {
  readonly titulo = input<string>('No se pudo cargar');
  readonly descripcion = input<string | null>(null);
  readonly iconoNombre = input<NombreIcono>('errorCarga');
  readonly etiquetaAccion = input<string>('Reintentar');
  readonly mostrarAccion = input<boolean>(true);
  readonly reintentar = output<void>();

  protected readonly icono = computed<LucideIconData>(
    () => ICONOS[this.iconoNombre()] as LucideIconData,
  );
}
