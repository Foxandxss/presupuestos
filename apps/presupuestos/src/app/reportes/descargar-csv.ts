// Descarga un Blob como archivo CSV usando un anchor temporal. Suficiente para
// el MVP; si aparece un requisito de "preview" o streaming grande, se reabre.

export function descargarCsv(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nombre;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
