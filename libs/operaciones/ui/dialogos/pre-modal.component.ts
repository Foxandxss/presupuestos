import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChild,
  input,
  output,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Dialog } from 'primeng/dialog';

import { ICONOS } from '../iconos';

export type PreModalSize = 'md' | 'lg';

/**
 * Marcador para el escape hatch de header personalizado.
 *
 * Uso: `<ng-template preModalHeader>...</ng-template>` dentro de `<pre-modal>`.
 * Cuando esta plantilla esta presente, sustituye al titulo por defecto.
 */
@Directive({
  selector: 'ng-template[preModalHeader]',
  standalone: true,
})
export class PreModalHeaderDirective {}

/**
 * Modal canonico del sistema de diseno.
 *
 * Wrappea `<p-dialog>` aplicando defaults opinados:
 * - Click en mask deshabilitado por defecto (evita perder lo escrito por accidente).
 * - Esc + boton X cierran (acciones explicitas).
 * - Tamanos canonicos `md` (~32rem) y `lg` (~48rem).
 * - Header con titulo + boton close Lucide.
 *
 * Slots:
 * - `<ng-content>` por defecto: cuerpo del modal.
 * - `<div preModalFooter>...</div>`: acciones del footer (renderizadas con
 *   separador encima).
 * - `<ng-template preModalHeader>...</ng-template>`: opcional, sustituye al
 *   header por defecto.
 */
@Component({
  selector: 'pre-modal',
  standalone: true,
  imports: [CommonModule, Dialog, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      [showHeader]="false"
      [closeOnEscape]="cerrable()"
      [dismissableMask]="false"
      [closable]="cerrable()"
      [styleClass]="claseSize()"
      [contentStyleClass]="'pre-modal__contenido'"
      (visibleChange)="onVisibleChange($event)"
    >
      <header class="pre-modal__header">
        @if (headerTpl(); as tpl) {
          <ng-container *ngTemplateOutlet="tpl"></ng-container>
        } @else {
          <h2 class="pre-modal__titulo">{{ titulo() }}</h2>
        }
        @if (cerrable()) {
          <button
            type="button"
            class="pre-modal__close"
            aria-label="Cerrar"
            (click)="cerrarPorBoton()"
          >
            <lucide-angular [img]="iconoCerrar" size="16" />
          </button>
        }
      </header>
      <div class="pre-modal__body">
        <ng-content></ng-content>
      </div>
      <div class="pre-modal__footer">
        <ng-content select="[preModalFooter]"></ng-content>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      :host ::ng-deep .pre-modal .p-dialog-content {
        padding: 0;
      }
      :host ::ng-deep .pre-modal--md {
        width: 32rem;
        max-width: calc(100vw - 2rem);
      }
      :host ::ng-deep .pre-modal--lg {
        width: 48rem;
        max-width: calc(100vw - 2rem);
      }
      .pre-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-subtle);
      }
      .pre-modal__titulo {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
        color: var(--text-default);
      }
      .pre-modal__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        color: var(--text-subtle);
        border-radius: var(--radius-sm);
        cursor: pointer;
      }
      .pre-modal__close:hover {
        background-color: var(--surface-muted, #f1f5f9);
        color: var(--text-default);
      }
      .pre-modal__close:focus-visible {
        outline: 2px solid var(--ring-focus);
        outline-offset: 2px;
      }
      .pre-modal__body {
        padding: 16px 20px;
      }
      .pre-modal__footer {
        display: none;
        padding: 12px 20px;
        border-top: 1px solid var(--border-subtle);
        gap: 8px;
        justify-content: flex-end;
      }
      .pre-modal__footer:has(> *) {
        display: flex;
      }
    `,
  ],
})
export class ModalComponent {
  /** Visibilidad. Compatible con `[(visible)]` two-way binding. */
  readonly visible = input.required<boolean>();
  /** Titulo del modal (renderizado en el header por defecto). */
  readonly titulo = input.required<string>();
  /** Tamano canonico del modal. */
  readonly size = input<PreModalSize>('md');
  /** Cuando false, oculta el boton X y deshabilita Esc. */
  readonly cerrable = input<boolean>(true);

  readonly visibleChange = output<boolean>();
  readonly cerrar = output<void>();

  protected readonly headerTpl = contentChild(PreModalHeaderDirective, {
    read: TemplateRef,
  });

  protected readonly iconoCerrar = ICONOS.cerrar;

  protected readonly claseSize = computed(
    () => `pre-modal pre-modal--${this.size()}`,
  );

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
    if (!v) this.cerrar.emit();
  }

  protected cerrarPorBoton(): void {
    this.visibleChange.emit(false);
    this.cerrar.emit();
  }
}
