import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';

import { PreChartComponent } from './pre-chart.component';
import { PALETA_PRE_CHART, defaultsParaChart } from './pre-chart-defaults';

const meta: Meta<PreChartComponent> = {
  title: 'Charts / pre-chart',
  component: PreChartComponent,
  decorators: [
    moduleMetadata({ imports: [PreChartComponent] }),
    (storyFn) => {
      const story = storyFn();
      return {
        ...story,
        template: `<div class="sb-card" style="max-width:680px;">${story.template ?? ''}</div>`,
      };
    },
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Wrapper canonico de PrimeNG p-chart con defaults centralizados (paleta, tipografia, tooltips slate-900). Detecta dataset vacio y muestra mensajeVacio en lugar del canvas.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<PreChartComponent>;

const COLORES_ESTADO: Record<string, string> = {
  Borrador: '#64748b',
  Solicitado: '#f59e0b',
  Aprobado: '#0ea5e9',
  EnEjecucion: '#10b981',
  Consumido: '#047857',
  Rechazado: '#ef4444',
  Cancelado: '#94a3b8',
};

export const DoughnutPedidos: Story = {
  name: 'Doughnut (reporte Pedidos)',
  args: {
    tipo: 'doughnut',
    alto: 320,
    ariaLabel: 'Distribucion de pedidos por estado',
    data: {
      labels: ['Borrador', 'Solicitado', 'Aprobado', 'EnEjecucion', 'Consumido'],
      datasets: [
        {
          data: [3, 5, 8, 12, 6],
          backgroundColor: [
            COLORES_ESTADO['Borrador'],
            COLORES_ESTADO['Solicitado'],
            COLORES_ESTADO['Aprobado'],
            COLORES_ESTADO['EnEjecucion'],
            COLORES_ESTADO['Consumido'],
          ],
          borderWidth: 0,
        },
      ],
    },
    opciones: defaultsParaChart({ ejes: 'ninguno' }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Doughnut con conteo por estado (reporte de Pedidos). Sin ejes cartesianos, leyenda inferior.',
      },
    },
  },
};

export const StackedHorizontalHoras: Story = {
  name: 'Stacked horizontal (reporte Horas)',
  args: {
    tipo: 'bar',
    alto: 360,
    ariaLabel: 'Horas estimadas vs ofertadas vs consumidas vs pendientes',
    data: {
      labels: [
        'Backend Senior',
        'Backend Junior',
        'Frontend Senior',
        'QA',
        'DevOps',
      ],
      datasets: [
        {
          label: 'Estimadas',
          data: [120, 80, 100, 60, 40],
          backgroundColor: PALETA_PRE_CHART[6],
        },
        {
          label: 'Ofertadas',
          data: [100, 70, 90, 50, 35],
          backgroundColor: PALETA_PRE_CHART[0],
        },
        {
          label: 'Consumidas',
          data: [60, 50, 70, 30, 20],
          backgroundColor: PALETA_PRE_CHART[2],
        },
        {
          label: 'Pendientes',
          data: [40, 20, 20, 20, 15],
          backgroundColor: PALETA_PRE_CHART[3],
        },
      ],
    },
    opciones: defaultsParaChart({
      stacked: true,
      indexAxis: 'y',
      formatoEjeY: (v) => `${v} h`,
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Stacked bar horizontal con 4 series por desglose. Eje Y con sufijo "h", eje X stacked.',
      },
    },
  },
};

export const GroupedVerticalFacturacion: Story = {
  name: 'Grouped vertical (reporte Facturacion)',
  args: {
    tipo: 'bar',
    alto: 320,
    ariaLabel: 'Facturacion por proveedor por mes',
    data: {
      labels: ['Ene 2026', 'Feb 2026', 'Mar 2026', 'Abr 2026', 'May 2026'],
      datasets: [
        {
          label: 'Acme S.L.',
          data: [4200, 5100, 6300, 4800, 5500],
          backgroundColor: PALETA_PRE_CHART[0],
        },
        {
          label: 'Globex',
          data: [2800, 3100, 3500, 4100, 3900],
          backgroundColor: PALETA_PRE_CHART[1],
        },
        {
          label: 'Initech',
          data: [1800, 2200, 2700, 3000, 2500],
          backgroundColor: PALETA_PRE_CHART[2],
        },
      ],
    },
    opciones: defaultsParaChart({
      formatoEjeY: (v) => `${v} €`,
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Bar agrupada vertical con 3 proveedores por mes. Eje Y con sufijo €.',
      },
    },
  },
};

export const SinDatos: Story = {
  args: {
    tipo: 'bar',
    alto: 280,
    data: { labels: [], datasets: [] },
    opciones: defaultsParaChart(),
    mensajeVacio: 'No hay datos para los filtros aplicados.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Cuando dataset.length=0 o todos los valores son 0/null, el componente muestra mensajeVacio en lugar del canvas vacio del chartjs.',
      },
    },
  },
};
