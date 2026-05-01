const FORMATEADOR_EUR = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const FORMATEADOR_HORAS = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const FORMATEADOR_PCT = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatearImporte(valor: number): string {
  return FORMATEADOR_EUR.format(valor);
}

export function formatearHoras(valor: number): string {
  return `${FORMATEADOR_HORAS.format(valor)} h`;
}

export function formatearEnteroES(valor: number): string {
  return FORMATEADOR_PCT.format(valor);
}
