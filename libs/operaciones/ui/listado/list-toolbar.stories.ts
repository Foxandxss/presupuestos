import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import {
  ListToolbarComponent,
  type DensidadLista,
} from './list-toolbar.component';

const meta: Meta<ListToolbarComponent> = {
  title: 'Listado / list-toolbar',
  component: ListToolbarComponent,
  decorators: [
    moduleMetadata({ imports: [ListToolbarComponent] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-card">${story.template ?? ''}</div>`,
      };
    },
  ],
  argTypes: {
    densidad: {
      control: { type: 'inline-radio' },
      options: ['estandar', 'compacta'] satisfies DensidadLista[],
    },
    hayFiltros: { control: { type: 'boolean' } },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Toolbar canonica para todas las listas: search + filtros proyectados + toggle de densidad + resumen + boton limpiar filtros (solo cuando hayFiltros=true).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<ListToolbarComponent>;

export const Vacia: Story = {
  args: {
    query: '',
    placeholder: 'Buscar pedido por #ID o proyecto...',
    densidad: 'estandar',
    hayFiltros: false,
    resumen: null,
    mostrarSearch: true,
  },
};

export const ConFiltrosActivos: Story = {
  args: {
    query: 'Acme',
    placeholder: 'Buscar pedido por #ID o proyecto...',
    densidad: 'estandar',
    hayFiltros: true,
    resumen: '12 de 145 pedidos',
    mostrarSearch: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cuando hayFiltros=true se muestra el boton "Limpiar filtros" alineado al search.',
      },
    },
  },
};

export const Compacta: Story = {
  args: {
    query: '',
    placeholder: 'Buscar...',
    densidad: 'compacta',
    hayFiltros: false,
    resumen: '145 consumos',
    mostrarSearch: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Densidad compacta — el toggle pasa a la version contraida.',
      },
    },
  },
};
