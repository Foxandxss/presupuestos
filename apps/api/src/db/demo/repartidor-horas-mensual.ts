// Función pura: dado un total de horas y una ventana de meses, reparte las
// horas entre los meses con curva realista (arranque, régimen, cola) y entre
// los recursos disponibles (1–2 por mes). Sin imports de DB, Drizzle, NestJS
// ni Faker — el rng se inyecta para que los tests usen un LCG determinista.
//
// Curva por mes (peso relativo, normalizado al final):
// - mes 1   ∈ [0.5, 0.7]  (arranque a media máquina)
// - régimen ∈ [0.9, 1.1]  (meses centrales)
// - cola    ∈ [0.4, 0.7]  (último mes a media máquina)
//
// Cuando la ventana es de 1 mes, ese mes lleva todas las horas; cuando es de
// 2 meses, se aplican arranque + cola sin régimen.

export interface MesAnio {
  mes: number; // 1..12
  anio: number;
}

export interface FilaConsumo {
  recursoId: number;
  mes: number;
  anio: number;
  horas: number;
}

export class RepartidorHorasMensualError extends Error {
  constructor(motivo: string) {
    super(`RepartidorHorasMensual: ${motivo}`);
    this.name = 'RepartidorHorasMensualError';
  }
}

const PRECISION = 100; // 2 decimales

export function repartirHoras(
  horasTotal: number,
  mesInicio: MesAnio,
  mesFin: MesAnio,
  recursos: number[],
  rng: () => number,
): FilaConsumo[] {
  if (recursos.length === 0) {
    throw new RepartidorHorasMensualError('recursos vacíos');
  }
  const meses = listarMeses(mesInicio, mesFin);
  if (meses.length === 0) {
    throw new RepartidorHorasMensualError(
      `mesFin (${formatMes(mesFin)}) anterior a mesInicio (${formatMes(mesInicio)})`,
    );
  }
  if (horasTotal <= 0) return [];

  const horasPorMes = repartirEntreMeses(horasTotal, meses.length, rng);
  // Garantizar que la suma redondeada cuadra con horasTotal.
  ajustarResiduo(horasPorMes, horasTotal);

  const filas: FilaConsumo[] = [];
  for (let i = 0; i < meses.length; i++) {
    const horasMes = horasPorMes[i];
    if (horasMes <= 0) continue;
    const filasMes = repartirMesEntreRecursos(horasMes, recursos, rng);
    for (const f of filasMes) {
      filas.push({
        recursoId: f.recursoId,
        mes: meses[i].mes,
        anio: meses[i].anio,
        horas: f.horas,
      });
    }
  }

  // Ajustar última fila para absorber residuos del split por recurso.
  ajustarFilasASuma(filas, horasTotal);

  return filas;
}

function repartirEntreMeses(
  horasTotal: number,
  numMeses: number,
  rng: () => number,
): number[] {
  const pesos = generarPesos(numMeses, rng);
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((p) => redondear((horasTotal * p) / sumaPesos));
}

function generarPesos(n: number, rng: () => number): number[] {
  if (n === 1) return [1.0];
  if (n === 2) {
    return [0.5 + rng() * 0.2, 0.4 + rng() * 0.3];
  }
  const pesos: number[] = [0.5 + rng() * 0.2];
  for (let i = 1; i < n - 1; i++) {
    pesos.push(0.9 + rng() * 0.2);
  }
  pesos.push(0.4 + rng() * 0.3);
  return pesos;
}

function ajustarResiduo(horasPorMes: number[], objetivo: number): void {
  const suma = horasPorMes.reduce((a, b) => a + b, 0);
  const residuo = redondear(objetivo - suma);
  if (residuo === 0) return;
  const ult = horasPorMes.length - 1;
  horasPorMes[ult] = Math.max(0, redondear(horasPorMes[ult] + residuo));
}

function repartirMesEntreRecursos(
  horasMes: number,
  recursos: number[],
  rng: () => number,
): { recursoId: number; horas: number }[] {
  // Con un solo recurso el mes va completo a ese recurso. Con ≥ 2 recursos
  // se usan los DOS primeros del input — cubre el UNIQUE(linea, recurso, mes,
  // anio) plural y empuja el volumen al rango ~2000 del PRD. El AC permite
  // 1–2 recursos por mes; quedarse siempre en 2 es el extremo legal.
  if (recursos.length === 1) {
    return [{ recursoId: recursos[0], horas: horasMes }];
  }
  // Reparto 30/70 a 70/30 dentro del mes — evita filas con 0 o casi 0 horas.
  const fraccionA = 0.3 + rng() * 0.4;
  const horasA = redondear(horasMes * fraccionA);
  const horasB = redondear(horasMes - horasA);
  const filas: { recursoId: number; horas: number }[] = [];
  if (horasA > 0) filas.push({ recursoId: recursos[0], horas: horasA });
  if (horasB > 0) filas.push({ recursoId: recursos[1], horas: horasB });
  return filas;
}

function ajustarFilasASuma(filas: FilaConsumo[], objetivo: number): void {
  if (filas.length === 0) return;
  const suma = filas.reduce((a, f) => a + f.horas, 0);
  const residuo = redondear(objetivo - suma);
  if (residuo === 0) return;
  const ult = filas.length - 1;
  filas[ult] = { ...filas[ult], horas: redondear(filas[ult].horas + residuo) };
}

function listarMeses(mesInicio: MesAnio, mesFin: MesAnio): MesAnio[] {
  const out: MesAnio[] = [];
  let a = mesInicio.anio;
  let m = mesInicio.mes;
  const finIdx = indiceMes(mesFin);
  while (indiceMes({ mes: m, anio: a }) <= finIdx) {
    out.push({ mes: m, anio: a });
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return out;
}

function indiceMes(m: MesAnio): number {
  return m.anio * 12 + (m.mes - 1);
}

function formatMes(m: MesAnio): string {
  return `${m.anio}-${String(m.mes).padStart(2, '0')}`;
}

function redondear(n: number): number {
  return Math.round(n * PRECISION) / PRECISION;
}
