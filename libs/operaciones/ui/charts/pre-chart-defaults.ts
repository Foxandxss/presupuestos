import type { ChartOptions } from 'chart.js';

export const PALETA_PRE_CHART: readonly string[] = [
  '#7c3aed', // violet-600
  '#0ea5e9', // sky-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#64748b', // slate-500
  '#a855f7', // purple-500 (extra hue para mas de 6 series)
  '#06b6d4', // cyan-500
];

export const COLOR_TEXTO_EJES = '#475569'; // slate-600
export const COLOR_GRID = '#e2e8f0'; // slate-200
export const COLOR_TOOLTIP_BG = '#0f172a'; // slate-900
export const COLOR_TOOLTIP_TEXTO = '#ffffff';

const FONT_FAMILY =
  "'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export interface PreChartOptionsParams {
  formatoEjeY?: (valor: number | string) => string;
  formatoTooltip?: (contexto: {
    label: string;
    valor: number;
    datasetLabel?: string;
  }) => string;
  stacked?: boolean;
  ejes?: 'cartesianos' | 'ninguno';
  indexAxis?: 'x' | 'y';
}

export function defaultsParaChart(
  params: PreChartOptionsParams = {},
): ChartOptions {
  const {
    formatoEjeY,
    formatoTooltip,
    stacked = false,
    ejes = 'cartesianos',
    indexAxis = 'x',
  } = params;

  const tickCallback = formatoEjeY
    ? (valor: number | string) => formatoEjeY(valor)
    : undefined;

  const opciones: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: COLOR_TEXTO_EJES,
          font: { family: FONT_FAMILY, size: 12 },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: COLOR_TOOLTIP_BG,
        titleColor: COLOR_TOOLTIP_TEXTO,
        bodyColor: COLOR_TOOLTIP_TEXTO,
        titleFont: { family: FONT_FAMILY, size: 12, weight: 600 },
        bodyFont: { family: FONT_FAMILY, size: 12 },
        cornerRadius: 6,
        padding: 10,
        displayColors: true,
        boxPadding: 4,
        callbacks: formatoTooltip
          ? {
              label: (ctx) =>
                formatoTooltip({
                  label: ctx.label ?? '',
                  valor: typeof ctx.parsed === 'number'
                    ? ctx.parsed
                    : (ctx.parsed as { x?: number; y?: number }).y ??
                      (ctx.parsed as { x?: number; y?: number }).x ??
                      0,
                  datasetLabel: ctx.dataset?.label,
                }),
            }
          : undefined,
      },
    },
  };

  if (ejes === 'cartesianos') {
    opciones.scales = {
      x: {
        stacked,
        ticks: {
          color: COLOR_TEXTO_EJES,
          font: { family: FONT_FAMILY, size: 11 },
        },
        grid: { color: COLOR_GRID, drawTicks: false },
        border: { color: COLOR_GRID },
      },
      y: {
        stacked,
        beginAtZero: true,
        ticks: {
          color: COLOR_TEXTO_EJES,
          font: { family: FONT_FAMILY, size: 11 },
          callback: tickCallback,
        },
        grid: { color: COLOR_GRID, drawTicks: false },
        border: { color: COLOR_GRID },
      },
    };
  }

  return opciones;
}
