// Helper para serializar filas a CSV (RFC 4180): comilla doble como escape,
// quoted cuando el valor contiene `,`, `"` o saltos de línea. Suficiente para
// los exports del MVP; si aparecen requisitos de Excel-friendly (BOM,
// separador `;`) se reabre.

export function toCsv(
  headers: string[],
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
): string {
  const lineas = [headers.map(escapar).join(',')];
  for (const row of rows) {
    lineas.push(row.map(escapar).join(','));
  }
  return lineas.join('\r\n');
}

function escapar(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  const str = String(valor);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
