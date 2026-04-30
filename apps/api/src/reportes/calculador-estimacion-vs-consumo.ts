// Deep module: calcula la tabla Estimadas / Ofertadas / Consumidas / Pendientes
// agregada por la dimensión solicitada (perfil, proveedor o cross-proyecto).
//
// El módulo opera sobre POJOs ya hidratados por el servicio (no toca Drizzle
// directamente). Las "estimaciones" son función de (proyecto, perfil); las
// "ofertadas" y "consumidas" llevan además el proveedor. Cuando el desglose
// no incluye una de esas dimensiones, sumamos. Cuando la dimensión "estimada"
// no aplica (e.g. desglose por proveedor), `horasEstimadas` queda en 0.

export const DESGLOSES_HORAS = [
  'proyecto-perfil',
  'perfil',
  'proveedor',
] as const;

export type DesgloseHoras = (typeof DESGLOSES_HORAS)[number];

export interface EntradaEstimacion {
  proyectoId: number;
  perfilTecnicoId: number;
  horasEstimadas: number;
}

export interface EntradaLinea {
  proyectoId: number;
  proveedorId: number;
  perfilTecnicoId: number;
  horasOfertadas: number;
}

export interface EntradaConsumoHoras {
  proyectoId: number;
  proveedorId: number;
  perfilTecnicoId: number;
  horasConsumidas: number;
}

export interface FiltrosHoras {
  proyectoId?: number;
  proveedorId?: number;
  perfilTecnicoId?: number;
}

export interface FilaHoras {
  proyectoId: number | null;
  proveedorId: number | null;
  perfilTecnicoId: number | null;
  horasEstimadas: number;
  horasOfertadas: number;
  horasConsumidas: number;
  horasPendientes: number;
}

interface Acumulador {
  estimadas: number;
  ofertadas: number;
  consumidas: number;
}

interface EntradaCalculo {
  estimaciones: EntradaEstimacion[];
  lineas: EntradaLinea[];
  consumos: EntradaConsumoHoras[];
  desglose: DesgloseHoras;
  filtros?: FiltrosHoras;
}

export const CalculadorEstimacionVsConsumo = {
  calcular(input: EntradaCalculo): FilaHoras[] {
    const filtros = input.filtros ?? {};
    const estimaciones = input.estimaciones.filter((e) =>
      cumpleEstimacion(e, filtros),
    );
    const lineas = input.lineas.filter((l) => cumpleLinea(l, filtros));
    const consumos = input.consumos.filter((c) => cumpleLinea(c, filtros));

    const mapa = new Map<string, { fila: FilaHoras; acc: Acumulador }>();

    for (const e of estimaciones) {
      // Las estimaciones sólo aportan a desgloses que incluyen perfil/proyecto.
      if (input.desglose === 'proveedor') continue;
      const fila = filaSegunDesglose(input.desglose, {
        proyectoId: e.proyectoId,
        perfilTecnicoId: e.perfilTecnicoId,
        proveedorId: null,
      });
      const key = claveDe(fila);
      const entry = mapa.get(key) ?? {
        fila,
        acc: { estimadas: 0, ofertadas: 0, consumidas: 0 },
      };
      entry.acc.estimadas += e.horasEstimadas;
      mapa.set(key, entry);
    }

    for (const l of lineas) {
      const fila = filaSegunDesglose(input.desglose, l);
      const key = claveDe(fila);
      const entry = mapa.get(key) ?? {
        fila,
        acc: { estimadas: 0, ofertadas: 0, consumidas: 0 },
      };
      entry.acc.ofertadas += l.horasOfertadas;
      mapa.set(key, entry);
    }

    for (const c of consumos) {
      const fila = filaSegunDesglose(input.desglose, c);
      const key = claveDe(fila);
      const entry = mapa.get(key) ?? {
        fila,
        acc: { estimadas: 0, ofertadas: 0, consumidas: 0 },
      };
      entry.acc.consumidas += c.horasConsumidas;
      mapa.set(key, entry);
    }

    return Array.from(mapa.values())
      .map(({ fila, acc }) => ({
        ...fila,
        horasEstimadas: redondear(acc.estimadas),
        horasOfertadas: redondear(acc.ofertadas),
        horasConsumidas: redondear(acc.consumidas),
        horasPendientes: redondear(acc.ofertadas - acc.consumidas),
      }))
      .sort(comparar);
  },
};

interface DimensionesRow {
  proyectoId: number | null;
  perfilTecnicoId: number | null;
  proveedorId: number | null;
}

function filaSegunDesglose(
  desglose: DesgloseHoras,
  dims: DimensionesRow,
): FilaHoras {
  const base: FilaHoras = {
    proyectoId: null,
    perfilTecnicoId: null,
    proveedorId: null,
    horasEstimadas: 0,
    horasOfertadas: 0,
    horasConsumidas: 0,
    horasPendientes: 0,
  };
  if (desglose === 'proyecto-perfil') {
    base.proyectoId = dims.proyectoId;
    base.perfilTecnicoId = dims.perfilTecnicoId;
  } else if (desglose === 'perfil') {
    base.perfilTecnicoId = dims.perfilTecnicoId;
  } else if (desglose === 'proveedor') {
    base.proveedorId = dims.proveedorId;
  }
  return base;
}

function claveDe(fila: FilaHoras): string {
  return `${fila.proyectoId ?? ''}|${fila.perfilTecnicoId ?? ''}|${fila.proveedorId ?? ''}`;
}

function cumpleEstimacion(
  e: EntradaEstimacion,
  filtros: FiltrosHoras,
): boolean {
  // Las estimaciones no llevan proveedor: si el filtro pide un proveedor
  // concreto, las descartamos (`horasEstimadas` queda en 0 para esa fila).
  if (filtros.proveedorId !== undefined) return false;
  if (filtros.proyectoId !== undefined && e.proyectoId !== filtros.proyectoId) {
    return false;
  }
  if (
    filtros.perfilTecnicoId !== undefined &&
    e.perfilTecnicoId !== filtros.perfilTecnicoId
  ) {
    return false;
  }
  return true;
}

function cumpleLinea(
  row: { proyectoId: number; proveedorId: number; perfilTecnicoId: number },
  filtros: FiltrosHoras,
): boolean {
  if (
    filtros.proyectoId !== undefined &&
    row.proyectoId !== filtros.proyectoId
  ) {
    return false;
  }
  if (
    filtros.proveedorId !== undefined &&
    row.proveedorId !== filtros.proveedorId
  ) {
    return false;
  }
  if (
    filtros.perfilTecnicoId !== undefined &&
    row.perfilTecnicoId !== filtros.perfilTecnicoId
  ) {
    return false;
  }
  return true;
}

function comparar(a: FilaHoras, b: FilaHoras): number {
  const aProy = a.proyectoId ?? 0;
  const bProy = b.proyectoId ?? 0;
  if (aProy !== bProy) return aProy - bProy;
  const aPerf = a.perfilTecnicoId ?? 0;
  const bPerf = b.perfilTecnicoId ?? 0;
  if (aPerf !== bPerf) return aPerf - bPerf;
  return (a.proveedorId ?? 0) - (b.proveedorId ?? 0);
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
