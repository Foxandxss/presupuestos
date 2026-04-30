// Deep module: agrega los consumos mensuales en facturación por (mes, año,
// proveedor) y devuelve el detalle drill-down. Usa la **tarifa congelada**
// de la línea (no la del Servicio actual): el consumidor del módulo (el
// servicio) inyecta el `precioHora` que viene de `lineas_pedido`. Si la
// línea no está congelada todavía, el servicio decide si la incluye o no.

export interface EntradaConsumoFacturacion {
  mes: number;
  anio: number;
  proveedorId: number;
  proyectoId: number;
  lineaPedidoId: number;
  recursoId: number;
  perfilTecnicoId: number;
  horasConsumidas: number;
  precioHora: number;
}

export interface FiltrosFacturacion {
  mesDesde?: { mes: number; anio: number };
  mesHasta?: { mes: number; anio: number };
  anio?: number;
  proveedorId?: number;
  proyectoId?: number;
}

export interface DetalleFacturacion {
  proyectoId: number;
  lineaPedidoId: number;
  perfilTecnicoId: number;
  recursoId: number;
  horasConsumidas: number;
  precioHora: number;
  importe: number;
}

export interface FilaFacturacion {
  mes: number;
  anio: number;
  proveedorId: number;
  totalEur: number;
  detalle: DetalleFacturacion[];
}

export const CalculadorFacturacionMensual = {
  calcular(
    consumos: EntradaConsumoFacturacion[],
    filtros: FiltrosFacturacion = {},
  ): FilaFacturacion[] {
    const filtrados = consumos.filter((c) => cumple(c, filtros));
    const grupos = new Map<string, FilaFacturacion>();

    for (const c of filtrados) {
      const key = `${c.anio}-${c.mes}-${c.proveedorId}`;
      const importe = redondear(c.horasConsumidas * c.precioHora);
      const detalle: DetalleFacturacion = {
        proyectoId: c.proyectoId,
        lineaPedidoId: c.lineaPedidoId,
        perfilTecnicoId: c.perfilTecnicoId,
        recursoId: c.recursoId,
        horasConsumidas: redondear(c.horasConsumidas),
        precioHora: redondear(c.precioHora),
        importe,
      };
      const fila = grupos.get(key) ?? {
        mes: c.mes,
        anio: c.anio,
        proveedorId: c.proveedorId,
        totalEur: 0,
        detalle: [],
      };
      fila.detalle.push(detalle);
      fila.totalEur = redondear(fila.totalEur + importe);
      grupos.set(key, fila);
    }

    return Array.from(grupos.values()).sort(comparar);
  },
};

function cumple(
  c: EntradaConsumoFacturacion,
  filtros: FiltrosFacturacion,
): boolean {
  const idx = c.anio * 12 + (c.mes - 1);
  if (filtros.mesDesde) {
    const desde =
      filtros.mesDesde.anio * 12 + (filtros.mesDesde.mes - 1);
    if (idx < desde) return false;
  }
  if (filtros.mesHasta) {
    const hasta =
      filtros.mesHasta.anio * 12 + (filtros.mesHasta.mes - 1);
    if (idx > hasta) return false;
  }
  if (filtros.anio !== undefined && c.anio !== filtros.anio) return false;
  if (
    filtros.proveedorId !== undefined &&
    c.proveedorId !== filtros.proveedorId
  ) {
    return false;
  }
  if (
    filtros.proyectoId !== undefined &&
    c.proyectoId !== filtros.proyectoId
  ) {
    return false;
  }
  return true;
}

function comparar(a: FilaFacturacion, b: FilaFacturacion): number {
  if (a.anio !== b.anio) return a.anio - b.anio;
  if (a.mes !== b.mes) return a.mes - b.mes;
  return a.proveedorId - b.proveedorId;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
