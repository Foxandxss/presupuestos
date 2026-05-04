import { Component, signal } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { providePrimeNG } from 'primeng/config';
import { InputTextModule } from 'primeng/inputtext';

import { PreFieldComponent } from './pre-field.component';

@Component({
  selector: 'pre-field-demo',
  standalone: true,
  imports: [PreFieldComponent, InputTextModule],
  template: `
    <div style="max-width: 24rem; padding: 1rem; background: var(--surface-card, #fff); border-radius: 8px;">
      <pre-field
        [label]="label"
        [controlId]="controlId"
        [error]="error"
        [hint]="hint"
        [requerido]="requerido"
        [ariaLabel]="ariaLabel"
      >
        <input
          pInputText
          [id]="controlId"
          [attr.aria-label]="ariaLabel || null"
          type="text"
          [value]="valor()"
          (input)="onInput($event)"
        />
      </pre-field>
    </div>
  `,
})
class PreFieldDemoComponent {
  label: string | null = 'Nombre';
  controlId = 'demo-campo';
  error: string | null = null;
  hint: string | null = null;
  requerido = false;
  ariaLabel: string | null = null;
  valor = signal('');

  onInput(ev: Event): void {
    this.valor.set((ev.target as HTMLInputElement).value);
  }
}

const meta: Meta<PreFieldDemoComponent> = {
  title: 'Dialogos / pre-field',
  component: PreFieldDemoComponent,
  decorators: [
    moduleMetadata({ imports: [PreFieldDemoComponent] }),
    applicationConfig({
      providers: [provideAnimationsAsync(), providePrimeNG({})],
    }),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Primitiva canonica de campo de formulario. Encapsula el patron label + control + error + hint que se duplicaba en los modales del catalogo. El control se proyecta via <ng-content>; el llamante pasa el mismo id al control PrimeNG (inputId) y a pre-field (controlId) para mantener el binding label-for explicito.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<PreFieldDemoComponent>;

export const Default: Story = {
  args: {
    label: 'Nombre',
    controlId: 'demo-campo',
    error: null,
    hint: null,
    requerido: false,
    ariaLabel: null,
  },
};

export const SinLabel: Story = {
  args: {
    label: null,
    controlId: 'demo-campo-sin-label',
    error: null,
    hint: null,
    requerido: false,
    ariaLabel: 'Horas estimadas',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Caso FormArray sin etiqueta visible. La accesibilidad recae en el llamante pasando aria-label al control proyectado.',
      },
    },
  },
};

export const ConError: Story = {
  args: {
    label: 'Email',
    controlId: 'demo-campo-error',
    error: 'Formato de email invalido.',
    hint: null,
    requerido: false,
    ariaLabel: null,
  },
};

export const ConHint: Story = {
  args: {
    label: 'Contrasena',
    controlId: 'demo-campo-hint',
    error: null,
    hint: 'Minimo 8 caracteres.',
    requerido: false,
    ariaLabel: null,
  },
};

export const Requerido: Story = {
  args: {
    label: 'Nombre',
    controlId: 'demo-campo-req',
    error: null,
    hint: null,
    requerido: true,
    ariaLabel: null,
  },
};

export const HintMasError: Story = {
  args: {
    label: 'Contrasena',
    controlId: 'demo-campo-hint-error',
    error: 'Demasiado corta.',
    hint: 'Minimo 8 caracteres.',
    requerido: true,
    ariaLabel: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cuando coexisten error y hint, ambos se renderizan: error primero, hint despues.',
      },
    },
  },
};

export const LabelLargo: Story = {
  args: {
    label:
      'Fecha de finalizacion estimada del proyecto si se completa segun plan',
    controlId: 'demo-campo-largo',
    error: null,
    hint: null,
    requerido: false,
    ariaLabel: null,
  },
};
