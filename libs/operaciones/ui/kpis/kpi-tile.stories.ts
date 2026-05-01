import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, moduleMetadata } from '@storybook/angular';
import { provideRouter } from '@angular/router';

import { ICONOS } from '../iconos';

import { KpiTileComponent } from './kpi-tile.component';

const meta: Meta<KpiTileComponent> = {
  title: 'KPIs / kpi-tile',
  component: KpiTileComponent,
  decorators: [
    moduleMetadata({ imports: [KpiTileComponent] }),
    applicationConfig({ providers: [provideRouter([])] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-grid-kpis">${story.template ?? ''}</div>`,
      };
    },
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Tile de KPI reutilizable en Inicio, Reportes y detail pages. Render como anchor cuando href esta presente; div semantico cuando no. Delta opcional con sign + porcentaje y texto secundario.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<KpiTileComponent>;

export const SinDelta: Story = {
  args: {
    etiqueta: 'Pedidos en ejecucion',
    valor: '12',
    icono: ICONOS.pedidos,
    delta: null,
    href: null,
  },
};

export const ConDeltaPositivo: Story = {
  args: {
    etiqueta: 'Facturacion del mes',
    valor: '24.580,00 €',
    icono: ICONOS.facturacion,
    delta: { porcentaje: 8, positivo: true, textoSecundario: 'vs mes anterior' },
    href: null,
  },
};

export const ConDeltaNegativo: Story = {
  args: {
    etiqueta: 'Horas consumidas',
    valor: '152,5 h',
    icono: ICONOS.consumos,
    delta: { porcentaje: 5, positivo: false, textoSecundario: 'vs mes anterior' },
    href: null,
  },
};

export const ComoCTA: Story = {
  args: {
    etiqueta: 'Pendientes aprobacion',
    valor: '4',
    icono: ICONOS.aprobar,
    delta: null,
    href: '/pedidos',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cuando href esta presente, el tile se renderiza como anchor con aria-label = etiqueta y hover state.',
      },
    },
  },
};
