import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import type { EstadoPedido } from '../../dominio';
import { ESTADOS_PEDIDO } from '../../dominio';

import {
  StatusBadgeComponent,
  type StatusBadgeSize,
} from './status-badge.component';

const meta: Meta<StatusBadgeComponent> = {
  title: 'Estados Pedido / status-badge',
  component: StatusBadgeComponent,
  decorators: [moduleMetadata({ imports: [StatusBadgeComponent] })],
  argTypes: {
    estado: {
      control: { type: 'select' },
      options: ESTADOS_PEDIDO as unknown as string[],
    },
    size: {
      control: { type: 'inline-radio' },
      options: ['sm', 'md', 'lg'] satisfies StatusBadgeSize[],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Badge unico para los 7 estados del Pedido. Mapeo semantico con tokens.css. Terminales (Consumido / Cancelado) en outline para evitar parchis en listas largas.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<StatusBadgeComponent>;

const estadoStory = (estado: EstadoPedido, size: StatusBadgeSize): Story => ({
  args: { estado, size },
});

export const BorradorSm: Story = estadoStory('Borrador', 'sm');
export const BorradorMd: Story = estadoStory('Borrador', 'md');
export const BorradorLg: Story = estadoStory('Borrador', 'lg');

export const SolicitadoSm: Story = estadoStory('Solicitado', 'sm');
export const SolicitadoMd: Story = estadoStory('Solicitado', 'md');
export const SolicitadoLg: Story = estadoStory('Solicitado', 'lg');

export const AprobadoSm: Story = estadoStory('Aprobado', 'sm');
export const AprobadoMd: Story = estadoStory('Aprobado', 'md');
export const AprobadoLg: Story = estadoStory('Aprobado', 'lg');

export const EnEjecucionSm: Story = estadoStory('EnEjecucion', 'sm');
export const EnEjecucionMd: Story = estadoStory('EnEjecucion', 'md');
export const EnEjecucionLg: Story = estadoStory('EnEjecucion', 'lg');

export const ConsumidoSm: Story = estadoStory('Consumido', 'sm');
export const ConsumidoMd: Story = estadoStory('Consumido', 'md');
export const ConsumidoLg: Story = estadoStory('Consumido', 'lg');

export const RechazadoSm: Story = estadoStory('Rechazado', 'sm');
export const RechazadoMd: Story = estadoStory('Rechazado', 'md');
export const RechazadoLg: Story = estadoStory('Rechazado', 'lg');

export const CanceladoSm: Story = estadoStory('Cancelado', 'sm');
export const CanceladoMd: Story = estadoStory('Cancelado', 'md');
export const CanceladoLg: Story = estadoStory('Cancelado', 'lg');

export const TodosLosEstadosMd: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Vista comparativa de los 7 estados en tamano md (default). Util para validar contraste y separacion semantica en un solo vistazo.',
      },
    },
  },
  render: () => ({
    template: `
      <div class="sb-row">
        <pre-status-badge estado="Borrador"></pre-status-badge>
        <pre-status-badge estado="Solicitado"></pre-status-badge>
        <pre-status-badge estado="Aprobado"></pre-status-badge>
        <pre-status-badge estado="EnEjecucion"></pre-status-badge>
        <pre-status-badge estado="Consumido"></pre-status-badge>
        <pre-status-badge estado="Rechazado"></pre-status-badge>
        <pre-status-badge estado="Cancelado"></pre-status-badge>
      </div>
    `,
  }),
};
