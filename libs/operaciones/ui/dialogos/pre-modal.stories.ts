import { Component, signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { ButtonModule } from 'primeng/button';
import { providePrimeNG } from 'primeng/config';
import { InputTextModule } from 'primeng/inputtext';

import { ModalComponent, PreModalHeaderDirective } from './pre-modal.component';

@Component({
  selector: 'pre-modal-demo',
  standalone: true,
  imports: [
    ModalComponent,
    PreModalHeaderDirective,
    ButtonModule,
    InputTextModule,
  ],
  template: `
    <p-button
      label="Abrir modal"
      icon="pi pi-window-maximize"
      (onClick)="abrir()"
    />
    <pre-modal
      [visible]="visible()"
      [titulo]="titulo"
      [size]="size"
      [cerrable]="cerrable"
      (visibleChange)="visible.set($event)"
    >
      @if (variante === 'header-custom') {
        <ng-template preModalHeader>
          <div style="display:flex;align-items:center;gap:8px;">
            <span
              style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#8b5cf6;"
            ></span>
            <strong>Header personalizado</strong>
          </div>
        </ng-template>
      }
      <p style="margin: 0 0 12px;">{{ cuerpo }}</p>
      <input pInputText type="text" placeholder="Campo demo" autofocus />
      @if (mostrarFooter) {
        <div preModalFooter>
          <p-button
            type="button"
            label="Cancelar"
            severity="secondary"
            [text]="true"
            (onClick)="visible.set(false)"
          />
          <p-button
            type="button"
            label="Guardar"
            icon="pi pi-check"
            (onClick)="visible.set(false)"
          />
        </div>
      }
    </pre-modal>
  `,
})
class ModalDemoComponent {
  visible = signal(true);
  titulo = 'Nuevo proveedor';
  cuerpo = 'Cuerpo del modal: el body se proyecta via <ng-content> default.';
  size: 'md' | 'lg' = 'md';
  cerrable = true;
  mostrarFooter = true;
  variante: 'default' | 'header-custom' = 'default';

  abrir(): void {
    this.visible.set(true);
  }
}

const meta: Meta<ModalDemoComponent> = {
  title: 'Dialogos / pre-modal',
  component: ModalDemoComponent,
  decorators: [
    moduleMetadata({ imports: [ModalDemoComponent] }),
    applicationConfig({
      providers: [provideAnimationsAsync(), providePrimeNG({})],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Modal canonico del sistema de diseno. Wrappea <p-dialog> con defaults opinados (mask no cierra, Esc + X cierran, tamanos canonicos md/lg, header con titulo + icono X Lucide). Slots: <ng-content> body, [preModalFooter] acciones, <ng-template preModalHeader> escape hatch.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<ModalDemoComponent>;

export const Md: Story = {
  args: {
    titulo: 'Nuevo proveedor',
    size: 'md',
    cerrable: true,
    mostrarFooter: true,
    variante: 'default',
  },
};

export const Lg: Story = {
  args: {
    titulo: 'Nuevo pedido (cabecera + lineas)',
    size: 'lg',
    cerrable: true,
    mostrarFooter: true,
    variante: 'default',
    cuerpo:
      'Tamano lg (~48rem). Pensado para forms con varias secciones (cabecera + N lineas).',
  },
};

export const ConHeaderCustom: Story = {
  args: {
    titulo: 'no se renderiza',
    size: 'md',
    cerrable: true,
    mostrarFooter: true,
    variante: 'header-custom',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cuando hay <ng-template preModalHeader>, sustituye al titulo por defecto. Util para casos con icono semantico, badges o markup arbitrario.',
      },
    },
  },
};

export const SinFooter: Story = {
  args: {
    titulo: 'Modal informativo',
    size: 'md',
    cerrable: true,
    mostrarFooter: false,
    variante: 'default',
    cuerpo: 'Sin slot [preModalFooter] proyectado: el modal no muestra separador inferior.',
  },
};

export const NoCerrable: Story = {
  args: {
    titulo: 'Modal no cerrable',
    size: 'md',
    cerrable: false,
    mostrarFooter: true,
    variante: 'default',
    cuerpo:
      'Cuando cerrable=false, oculta el boton X y deshabilita Esc. Usar con cuidado: el cierre debe venir de una accion dentro del cuerpo o footer.',
  },
};
