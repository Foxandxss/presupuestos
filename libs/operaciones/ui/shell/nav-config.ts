import type { Rol } from '../../dominio';
import type { NombreIcono } from '../iconos';

export interface NavItem {
  readonly label: string;
  readonly icono: NombreIcono;
  readonly ruta: string;
}

export interface NavGroup {
  readonly label: string;
  readonly rolesPermitidos?: readonly Rol[];
  readonly items: readonly NavItem[];
}

export const ITEM_INICIO: NavItem = {
  label: 'Inicio',
  icono: 'inicio',
  ruta: '/inicio',
};

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Catálogo',
    items: [
      { label: 'Proveedores', icono: 'proveedores', ruta: '/catalogo/proveedores' },
      { label: 'Perfiles técnicos', icono: 'perfiles', ruta: '/catalogo/perfiles-tecnicos' },
      { label: 'Recursos', icono: 'recursos', ruta: '/catalogo/recursos' },
      { label: 'Servicios', icono: 'servicios', ruta: '/catalogo/servicios' },
    ],
  },
  {
    label: 'Operativa',
    items: [
      { label: 'Proyectos', icono: 'proyectos', ruta: '/proyectos' },
      { label: 'Pedidos', icono: 'pedidos', ruta: '/pedidos' },
      { label: 'Consumos', icono: 'consumos', ruta: '/consumos' },
    ],
  },
  {
    label: 'Reportes',
    rolesPermitidos: ['admin'],
    items: [
      { label: 'Pedidos', icono: 'reportes', ruta: '/reportes/pedidos' },
      { label: 'Estimadas vs consumidas', icono: 'reportes', ruta: '/reportes/horas' },
      { label: 'Facturación', icono: 'facturacion', ruta: '/reportes/facturacion' },
    ],
  },
];

export interface Crumb {
  readonly label: string;
  readonly ruta: string | null;
}

/**
 * Deriva los breadcrumbs de la URL actual matcheando contra el árbol de
 * navegación. URLs no mapeadas caen al último segmento legible.
 */
export function construirBreadcrumbs(url: string): readonly Crumb[] {
  const path = url.split(/[?#]/)[0];
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] === 'inicio') {
    return [{ label: ITEM_INICIO.label, ruta: null }];
  }

  for (const grupo of NAV_GROUPS) {
    for (const item of grupo.items) {
      const itemSegs = item.ruta.split('/').filter(Boolean);
      const matches =
        segments.length >= itemSegs.length &&
        itemSegs.every((s, i) => s === segments[i]);
      if (!matches) continue;

      const crumbs: Crumb[] = [
        { label: grupo.label, ruta: null },
        {
          label: item.label,
          ruta: segments.length > itemSegs.length ? item.ruta : null,
        },
      ];
      if (segments.length > itemSegs.length) {
        crumbs.push({
          label: segments.slice(itemSegs.length).join(' / '),
          ruta: null,
        });
      }
      return crumbs;
    }
  }

  return [{ label: segments[segments.length - 1], ruta: null }];
}
