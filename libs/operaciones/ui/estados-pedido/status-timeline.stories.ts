import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import type { EstadoPedido } from '../../dominio';
import { ESTADOS_PEDIDO } from '../../dominio';

import { StatusTimelineComponent } from './status-timeline.component';

interface TimelineArgs {
  estado: EstadoPedido;
  fechaSolicitud: string | null;
  fechaAprobacion: string | null;
  fechaEnEjecucion: string | null;
  fechaConsumido: string | null;
  fechaTerminacion: string | null;
  estadoPrevioTerminal: EstadoPedido | null;
}

const meta: Meta<TimelineArgs> = {
  title: 'Estados Pedido / status-timeline',
  component: StatusTimelineComponent,
  decorators: [
    moduleMetadata({ imports: [StatusTimelineComponent] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-card">${story.template ?? ''}</div>`,
      };
    },
  ],
  argTypes: {
    estado: {
      control: { type: 'select' },
      options: ESTADOS_PEDIDO as unknown as string[],
    },
    fechaSolicitud: { control: { type: 'text' } },
    fechaAprobacion: { control: { type: 'text' } },
    fechaEnEjecucion: { control: { type: 'text' } },
    fechaConsumido: { control: { type: 'text' } },
    fechaTerminacion: { control: { type: 'text' } },
    estadoPrevioTerminal: {
      control: { type: 'select' },
      options: [null, ...(ESTADOS_PEDIDO as unknown as string[])],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Linea de tiempo del Pedido. Stepper de 5 nodos para el happy path; card terminal "[accion] el [fecha] desde [estado]" para Rechazado / Cancelado.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<TimelineArgs>;

export const Borrador: Story = {
  args: {
    estado: 'Borrador',
    fechaSolicitud: null,
    fechaAprobacion: null,
    fechaEnEjecucion: null,
    fechaConsumido: null,
    fechaTerminacion: null,
    estadoPrevioTerminal: null,
  },
};

export const Solicitado: Story = {
  args: {
    estado: 'Solicitado',
    fechaSolicitud: '2026-04-15',
    fechaAprobacion: null,
    fechaEnEjecucion: null,
    fechaConsumido: null,
    fechaTerminacion: null,
    estadoPrevioTerminal: null,
  },
};

export const Aprobado: Story = {
  args: {
    estado: 'Aprobado',
    fechaSolicitud: '2026-04-15',
    fechaAprobacion: '2026-04-18',
    fechaEnEjecucion: null,
    fechaConsumido: null,
    fechaTerminacion: null,
    estadoPrevioTerminal: null,
  },
};

export const EnEjecucion: Story = {
  args: {
    estado: 'EnEjecucion',
    fechaSolicitud: '2026-04-15',
    fechaAprobacion: '2026-04-18',
    fechaEnEjecucion: '2026-05-02',
    fechaConsumido: null,
    fechaTerminacion: null,
    estadoPrevioTerminal: null,
  },
};

export const Consumido: Story = {
  args: {
    estado: 'Consumido',
    fechaSolicitud: '2026-04-15',
    fechaAprobacion: '2026-04-18',
    fechaEnEjecucion: '2026-05-02',
    fechaConsumido: '2026-08-30',
    fechaTerminacion: null,
    estadoPrevioTerminal: null,
  },
};

export const RechazadoTerminal: Story = {
  args: {
    estado: 'Rechazado',
    fechaSolicitud: '2026-04-15',
    fechaAprobacion: null,
    fechaEnEjecucion: null,
    fechaConsumido: null,
    fechaTerminacion: '2026-04-17',
    estadoPrevioTerminal: 'Solicitado',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Card terminal: "Rechazado el [fecha] desde Solicitado". Sustituye al stepper.',
      },
    },
  },
};

export const CanceladoTerminal: Story = {
  args: {
    estado: 'Cancelado',
    fechaSolicitud: '2026-04-15',
    fechaAprobacion: '2026-04-18',
    fechaEnEjecucion: null,
    fechaConsumido: null,
    fechaTerminacion: '2026-04-22',
    estadoPrevioTerminal: 'Aprobado',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Card terminal cuando el Pedido fue cancelado tras aprobacion.',
      },
    },
  },
};
