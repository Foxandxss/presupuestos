const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * Formatea una fecha ISO `YYYY-MM-DD` o ISO con hora a `12 mar 2026`.
 *
 * Devuelve null si la entrada es null/undefined o no parseable — los
 * componentes del timeline distinguen "sin fecha" de "fecha cero".
 */
export function formatearFechaCorta(
  iso: string | null | undefined,
): string | null {
  if (!iso) {
    return null;
  }
  // Aceptamos tanto YYYY-MM-DD como ISO con hora ISO 8601.
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }
  const dia = fecha.getDate();
  const mes = MESES_CORTOS[fecha.getMonth()];
  const ano = fecha.getFullYear();
  return `${dia} ${mes} ${ano}`;
}
