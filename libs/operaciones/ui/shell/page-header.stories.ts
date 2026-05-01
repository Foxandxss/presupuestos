import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { PageHeaderComponent } from './page-header.component';

const meta: Meta<PageHeaderComponent> = {
  title: 'Shell / page-header',
  component: PageHeaderComponent,
  decorators: [moduleMetadata({ imports: [PageHeaderComponent] })],
  parameters: {
    docs: {
      description: {
        component:
          'Header canonico para todas las paginas: titulo + descripcion opcional + slot de acciones (boton primario "+ Crear ...").',
      },
    },
  },
};
export default meta;

type Story = StoryObj<PageHeaderComponent>;

export const SoloTitulo: Story = {
  args: { titulo: 'Pedidos', descripcion: null },
  render: (args) => ({
    props: args,
    template: `
      <pre-page-header [titulo]="titulo" [descripcion]="descripcion"></pre-page-header>
    `,
  }),
};

export const ConDescripcion: Story = {
  args: {
    titulo: 'Pedidos',
    descripcion: 'Pedidos por hora a proveedores con su ciclo de aprobacion.',
  },
  render: (args) => ({
    props: args,
    template: `
      <pre-page-header [titulo]="titulo" [descripcion]="descripcion"></pre-page-header>
    `,
  }),
};

export const ConAccionPrimaria: Story = {
  args: {
    titulo: 'Pedidos',
    descripcion: 'Pedidos por hora a proveedores con su ciclo de aprobacion.',
  },
  render: (args) => ({
    props: args,
    template: `
      <pre-page-header [titulo]="titulo" [descripcion]="descripcion">
        <button slot="actions" type="button" class="p-button p-button-sm">+ Crear pedido</button>
      </pre-page-header>
    `,
  }),
};
