import { defaultsParaChart } from './pre-chart-defaults';

describe('defaultsParaChart', () => {
  it('aplica defaults de leyenda y tooltip con tokens del DS', () => {
    const opts = defaultsParaChart();
    expect(opts.responsive).toBe(true);
    expect(opts.maintainAspectRatio).toBe(false);
    expect(opts.plugins?.legend?.position).toBe('bottom');
    expect(opts.plugins?.tooltip?.backgroundColor).toBe('#0f172a');
    expect(opts.plugins?.tooltip?.titleColor).toBe('#ffffff');
  });

  it('configura ejes cartesianos por defecto', () => {
    const opts = defaultsParaChart();
    expect(opts.scales?.['x']).toBeDefined();
    expect(opts.scales?.['y']).toBeDefined();
  });

  it('omite ejes cuando ejes="ninguno" (donut/pie)', () => {
    const opts = defaultsParaChart({ ejes: 'ninguno' });
    expect(opts.scales).toBeUndefined();
  });

  it('aplica stacked en ambos ejes cuando se pide', () => {
    const opts = defaultsParaChart({ stacked: true });
    const x = opts.scales?.['x'] as { stacked?: boolean } | undefined;
    const y = opts.scales?.['y'] as { stacked?: boolean } | undefined;
    expect(x?.stacked).toBe(true);
    expect(y?.stacked).toBe(true);
  });

  it('respeta indexAxis="y" para barras horizontales', () => {
    const opts = defaultsParaChart({ indexAxis: 'y' });
    expect(opts.indexAxis).toBe('y');
  });

  it('aplica callback de formato a ticks del eje Y cuando se pasa formatoEjeY', () => {
    const opts = defaultsParaChart({
      formatoEjeY: (v) => `${v} h`,
    });
    const y = opts.scales?.['y'] as
      | { ticks?: { callback?: (v: number | string) => string } }
      | undefined;
    expect(y?.ticks?.callback).toBeDefined();
    expect(y?.ticks?.callback?.(120)).toBe('120 h');
  });
});
