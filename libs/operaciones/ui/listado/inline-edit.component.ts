import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * `<pre-inline-edit>` — edición in-place de un valor de texto corto.
 *
 * Doble-click activa edición; Enter o blur confirman; Esc cancela. El
 * componente emite `guardar` con el nuevo valor sólo si cambió y respeta
 * el `minLongitud` (por defecto 1). Cuando `editable=false` se renderiza
 * el valor sin afordancia de edición.
 */
@Component({
  selector: 'pre-inline-edit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (editando()) {
      <input
        #input
        type="text"
        class="pre-inline-edit__input"
        [(ngModel)]="borrador"
        (keydown.enter)="confirmar()"
        (keydown.escape)="cancelar()"
        (blur)="confirmar()"
        [attr.aria-label]="ariaLabel()"
      />
    } @else {
      <span
        class="pre-inline-edit__valor"
        [class.pre-inline-edit__valor--editable]="editable()"
        [attr.tabindex]="editable() ? 0 : null"
        [attr.role]="editable() ? 'button' : null"
        [attr.aria-label]="
          editable() ? 'Editar ' + valor() + '. Doble click o Enter' : null
        "
        (dblclick)="entrarEnEdicion()"
        (keydown.enter)="entrarEnEdicion()"
      >
        {{ valor() }}
      </span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-block;
        max-width: 100%;
      }
      .pre-inline-edit__valor {
        display: inline-block;
        padding: 2px 4px;
        border-radius: var(--radius-xs);
        color: var(--text-default);
        cursor: default;
      }
      .pre-inline-edit__valor--editable {
        cursor: text;
      }
      .pre-inline-edit__valor--editable:hover {
        background-color: var(--surface-muted);
        outline: 1px dashed var(--border-default);
      }
      .pre-inline-edit__valor--editable:focus-visible {
        outline: 2px solid var(--ring-focus);
        outline-offset: 2px;
      }
      .pre-inline-edit__input {
        width: 100%;
        height: 28px;
        padding: 0 6px;
        border: 1px solid var(--ring-focus);
        border-radius: var(--radius-xs);
        background-color: var(--surface-card);
        color: var(--text-default);
        font-size: 13px;
        font-family: var(--font-sans);
        outline: none;
        box-shadow: 0 0 0 3px
          color-mix(in srgb, var(--ring-focus) 25%, transparent);
      }
    `,
  ],
})
export class InlineEditComponent {
  readonly valor = input.required<string>();
  readonly editable = input<boolean>(true);
  readonly minLongitud = input<number>(1);
  readonly ariaLabel = input<string | null>(null);

  readonly guardar = output<string>();

  protected readonly editando = signal(false);
  protected borrador = '';

  @ViewChild('input') private inputRef?: ElementRef<HTMLInputElement>;

  private readonly host = inject(ElementRef<HTMLElement>);

  protected entrarEnEdicion(): void {
    if (!this.editable()) return;
    this.borrador = this.valor();
    this.editando.set(true);
    queueMicrotask(() => {
      const el = this.inputRef?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    });
  }

  protected confirmar(): void {
    if (!this.editando()) return;
    const limpio = this.borrador.trim();
    const original = this.valor();
    if (limpio.length < this.minLongitud() || limpio === original) {
      this.editando.set(false);
      return;
    }
    this.editando.set(false);
    this.guardar.emit(limpio);
  }

  protected cancelar(): void {
    this.editando.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.editando()) return;
    const target = event.target as Node | null;
    if (target && !this.host.nativeElement.contains(target)) {
      this.confirmar();
    }
  }
}
