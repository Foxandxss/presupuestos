import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  input,
  isDevMode,
} from '@angular/core';

/**
 * Primitiva canonica de campo de formulario.
 *
 * Encapsula el patron `label + control + error + hint` que se duplicaba en los
 * modales del catalogo. El control se proyecta via `<ng-content>`; el llamante
 * pasa el mismo id al control PrimeNG (`[inputId]`) y a `pre-field`
 * (`[controlId]`) para mantener el binding `<label for>` explicito.
 *
 * API:
 * - `label`: texto del label. Cuando esta ausente, no se renderiza
 *   (caso FormArray sin etiqueta visible). La accesibilidad recae en el
 *   llamante: debe pasar `aria-label` al control.
 * - `controlId`: id del control. Vincula `<label for>` con el `inputId`
 *   del control PrimeNG.
 * - `error`: mensaje de error inline. Si truthy, se renderiza bajo el
 *   control con tipografia y color de error.
 * - `hint`: texto auxiliar. Si truthy, se renderiza bajo el control (tras
 *   el error si ambos coexisten).
 * - `requerido`: cuando true, anade asterisco visual al lado del label.
 * - `ariaLabel`: pasado al llamante como referencia; el componente solo lo
 *   usa para silenciar el warning de a11y cuando no hay `label`.
 */
@Component({
  selector: 'pre-field',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="pre-field">
      @if (label(); as txt) {
        <label
          class="pre-field__label"
          [attr.for]="controlId() || null"
        >
          {{ txt }}
          @if (requerido()) {
            <span class="pre-field__requerido" aria-hidden="true">*</span>
          }
        </label>
      }
      <div class="pre-field__control">
        <ng-content></ng-content>
      </div>
      @if (error(); as msg) {
        <small class="pre-field__error">{{ msg }}</small>
      }
      @if (hint(); as msg) {
        <small class="pre-field__hint">{{ msg }}</small>
      }
    </div>
  `,
  styles: [
    `
      .pre-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .pre-field__label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-default);
        line-height: 18px;
      }
      .pre-field__requerido {
        color: #b91c1c;
        margin-left: 2px;
      }
      .pre-field__error {
        font-size: 11px;
        color: #b91c1c;
        line-height: 16px;
      }
      .pre-field__hint {
        font-size: 12px;
        color: var(--text-subtle);
        line-height: 16px;
      }
    `,
  ],
})
export class PreFieldComponent implements OnInit {
  readonly label = input<string | null | undefined>();
  readonly controlId = input<string | null | undefined>();
  readonly error = input<string | null | undefined>();
  readonly hint = input<string | null | undefined>();
  readonly requerido = input<boolean>(false);
  readonly ariaLabel = input<string | null | undefined>();

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly tieneLabel = computed(() => {
    const v = this.label();
    return typeof v === 'string' && v.length > 0;
  });

  ngOnInit(): void {
    if (!isDevMode()) return;
    if (this.tieneLabel()) return;
    if (this.ariaLabel()) return;
    queueMicrotask(() => {
      const el = this.host.nativeElement as HTMLElement;
      const control = el.querySelector(
        '.pre-field__control [aria-label], .pre-field__control [aria-labelledby]',
      );
      if (control) return;
      console.warn(
        '[pre-field] sin label visible y sin aria-label en el control proyectado: el campo es inaccesible para lectores de pantalla',
      );
    });
  }
}
