import { construirBreadcrumbs, NAV_GROUPS } from './nav-config';

describe('construirBreadcrumbs', () => {
  it('devuelve "Inicio" cuando la URL es /inicio', () => {
    expect(construirBreadcrumbs('/inicio')).toEqual([
      { label: 'Inicio', ruta: null },
    ]);
  });

  it('devuelve "Inicio" para la raíz', () => {
    expect(construirBreadcrumbs('/')).toEqual([
      { label: 'Inicio', ruta: null },
    ]);
  });

  it('mapea /catalogo/proveedores a "Catálogo / Proveedores"', () => {
    expect(construirBreadcrumbs('/catalogo/proveedores')).toEqual([
      { label: 'Catálogo', ruta: null },
      { label: 'Proveedores', ruta: null },
    ]);
  });

  it('mapea /pedidos a "Operativa / Pedidos"', () => {
    expect(construirBreadcrumbs('/pedidos')).toEqual([
      { label: 'Operativa', ruta: null },
      { label: 'Pedidos', ruta: null },
    ]);
  });

  it('mapea /reportes/facturacion a "Reportes / Facturación"', () => {
    expect(construirBreadcrumbs('/reportes/facturacion')).toEqual([
      { label: 'Reportes', ruta: null },
      { label: 'Facturación', ruta: null },
    ]);
  });

  it('añade segmento de detalle para /pedidos/142', () => {
    expect(construirBreadcrumbs('/pedidos/142')).toEqual([
      { label: 'Operativa', ruta: null },
      { label: 'Pedidos', ruta: '/pedidos' },
      { label: '142', ruta: null },
    ]);
  });

  it('ignora query y hash al matchear', () => {
    expect(construirBreadcrumbs('/pedidos?estado=Aprobado#top')).toEqual([
      { label: 'Operativa', ruta: null },
      { label: 'Pedidos', ruta: null },
    ]);
  });

  it('cae a último segmento para rutas no mapeadas', () => {
    expect(construirBreadcrumbs('/no-existe')).toEqual([
      { label: 'no-existe', ruta: null },
    ]);
  });
});

describe('NAV_GROUPS', () => {
  it('marca el grupo Reportes como admin-only', () => {
    const reportes = NAV_GROUPS.find((g) => g.label === 'Reportes');
    expect(reportes?.rolesPermitidos).toEqual(['admin']);
  });

  it('deja Catálogo y Operativa visibles para todos los roles', () => {
    expect(
      NAV_GROUPS.find((g) => g.label === 'Catálogo')?.rolesPermitidos,
    ).toBeUndefined();
    expect(
      NAV_GROUPS.find((g) => g.label === 'Operativa')?.rolesPermitidos,
    ).toBeUndefined();
  });
});
