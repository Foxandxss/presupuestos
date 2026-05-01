import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { EmptyStateComponent } from './empty-state.component';

const meta: Meta<EmptyStateComponent> = {
  title: 'Listado / empty-state',
  component: EmptyStateComponent,
  decorators: [
    moduleMetadata({ imports: [EmptyStateComponent] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-fixed-width">${story.template ?? ''}</div>`,
      };
    },
  ],
  argTypes: {
    variante: {
      control: { type: 'inline-radio' },
      options: ['primer-uso', 'sin-resultados'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Estado vacio canonico. Variantes "primer-uso" (icono Inbox + CTA "Anadir el primero") y "sin-resultados" (icono SearchX + CTA "Limpiar filtros"). El CTA se proyecta via ng-content.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<EmptyStateComponent>;

export const PrimerUso: Story = {
  args: {
    variante: 'primer-uso',
    titulo: 'Aun no hay proveedores',
    descripcion: 'Anade el primer proveedor para empezar a crear pedidos.',
  },
  render: (args) => ({
    props: args,
    template: `
      <pre-empty-state
        [variante]="variante"
        [titulo]="titulo"
        [descripcion]="descripcion"
      >
        <button type="button" class="p-button p-button-sm">+ Anadir proveedor</button>
      </pre-empty-state>
    `,
  }),
};

export const SinResultados: Story = {
  args: {
    variante: 'sin-resultados',
    titulo: 'Ningun pedido cumple los filtros',
    descripcion: 'Cambia o limpia los filtros para ver resultados.',
  },
  render: (args) => ({
    props: args,
    template: `
      <pre-empty-state
        [variante]="variante"
        [titulo]="titulo"
        [descripcion]="descripcion"
      >
        <button type="button" class="p-button p-button-sm p-button-outlined">Limpiar filtros</button>
      </pre-empty-state>
    `,
  }),
};
