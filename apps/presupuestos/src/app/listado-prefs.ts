import type { DensidadLista } from '@operaciones/ui/listado';

export function leerDensidadInicial(seccion: string): DensidadLista {
  if (typeof localStorage === 'undefined') return 'estandar';
  const raw = localStorage.getItem(`presupuestos.lista.densidad.${seccion}`);
  return raw === 'compacta' ? 'compacta' : 'estandar';
}

export function leerFilasInicial(seccion: string): number {
  if (typeof localStorage === 'undefined') return 10;
  const raw = Number(
    localStorage.getItem(`presupuestos.lista.filas.${seccion}`),
  );
  return [10, 25, 50].includes(raw) ? raw : 10;
}

export function persistirDensidad(seccion: string, densidad: DensidadLista): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`presupuestos.lista.densidad.${seccion}`, densidad);
}

export function persistirFilas(seccion: string, filas: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(`presupuestos.lista.filas.${seccion}`, String(filas));
}
