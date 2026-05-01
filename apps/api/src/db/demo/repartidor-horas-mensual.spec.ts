import {
  FilaConsumo,
  MesAnio,
  RepartidorHorasMensualError,
  repartirHoras,
} from './repartidor-horas-mensual';

// rng determinista — mismo patrón que simulador-ciclo-pedido.spec.ts: permite
// verificar reproducibilidad sin depender de Faker.
function lcg(seed: number): () => number {
  let s = seed % 2_147_483_647;
  if (s <= 0) s += 2_147_483_646;
  return () => {
    s = (s * 16_807) % 2_147_483_647;
    return (s - 1) / 2_147_483_646;
  };
}

const ENERO_2025: MesAnio = { mes: 1, anio: 2025 };

function sumar(m: MesAnio, offset: number): MesAnio {
  const total = m.anio * 12 + (m.mes - 1) + offset;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

function agruparPorMes(filas: FilaConsumo[]): number[] {
  const map = new Map<number, number>();
  for (const f of filas) {
    const k = f.anio * 12 + (f.mes - 1);
    map.set(k, (map.get(k) ?? 0) + f.horas);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
}

describe('repartirHoras', () => {
  describe('suma total', () => {
    it.each([1, 2, 3, 6, 12])(
      'suma de horas iguala horasTotal con N=%i meses',
      (numMeses) => {
        for (const seed of [1, 7, 42, 99]) {
          const horasTotal = 320;
          const filas = repartirHoras(
            horasTotal,
            ENERO_2025,
            sumar(ENERO_2025, numMeses - 1),
            [10, 20],
            lcg(seed),
          );
          const suma = filas.reduce((a, f) => a + f.horas, 0);
          expect(Math.abs(suma - horasTotal)).toBeLessThan(0.01);
        }
      },
    );

    it('horasTotal=0 devuelve []', () => {
      const filas = repartirHoras(
        0,
        ENERO_2025,
        sumar(ENERO_2025, 5),
        [10, 20],
        lcg(1),
      );
      expect(filas).toEqual([]);
    });
  });

  describe('curva mensual', () => {
    it('mes 1 / régimen ∈ [0.4, 0.8] y cola / régimen ∈ [0.35, 0.8] con N≥3', () => {
      // Múltiples seeds para evitar que un sorteo extremo nos engañe.
      for (const seed of [1, 7, 42, 99, 123]) {
        const filas = repartirHoras(
          1200,
          ENERO_2025,
          sumar(ENERO_2025, 11), // 12 meses
          [1, 2],
          lcg(seed),
        );
        const horasPorMes = agruparPorMes(filas);
        const middle = horasPorMes.slice(1, -1);
        const meanMid = middle.reduce((a, b) => a + b, 0) / middle.length;
        expect(horasPorMes[0] / meanMid).toBeGreaterThanOrEqual(0.4);
        expect(horasPorMes[0] / meanMid).toBeLessThanOrEqual(0.8);
        expect(horasPorMes[horasPorMes.length - 1] / meanMid).toBeGreaterThanOrEqual(0.35);
        expect(horasPorMes[horasPorMes.length - 1] / meanMid).toBeLessThanOrEqual(0.8);
      }
    });

    it('régimen mes a mes en [0.8, 1.2] de la media de régimen (incluye margen de jitter)', () => {
      const filas = repartirHoras(
        1000,
        ENERO_2025,
        sumar(ENERO_2025, 7), // 8 meses
        [1, 2],
        lcg(11),
      );
      const horasPorMes = agruparPorMes(filas);
      const middle = horasPorMes.slice(1, -1);
      const meanMid = middle.reduce((a, b) => a + b, 0) / middle.length;
      for (const h of middle) {
        expect(h / meanMid).toBeGreaterThan(0.8);
        expect(h / meanMid).toBeLessThan(1.2);
      }
    });

    it('distribución mensual no es plana (max/min > 1.2 con N≥3)', () => {
      const filas = repartirHoras(
        500,
        ENERO_2025,
        sumar(ENERO_2025, 4), // 5 meses
        [1, 2],
        lcg(3),
      );
      const horasPorMes = agruparPorMes(filas);
      const max = Math.max(...horasPorMes);
      const min = Math.min(...horasPorMes);
      expect(max / min).toBeGreaterThan(1.2);
    });
  });

  describe('recursos', () => {
    it('cada fila usa un recurso del input', () => {
      const recursos = [10, 20, 30];
      const filas = repartirHoras(
        500,
        ENERO_2025,
        sumar(ENERO_2025, 4),
        recursos,
        lcg(5),
      );
      for (const f of filas) {
        expect(recursos).toContain(f.recursoId);
      }
    });

    it('línea con 1 solo recurso: todas las filas referencian ese recurso', () => {
      const filas = repartirHoras(
        300,
        ENERO_2025,
        sumar(ENERO_2025, 5),
        [42],
        lcg(1),
      );
      for (const f of filas) {
        expect(f.recursoId).toBe(42);
      }
    });
  });

  describe('UNIQUE (recurso, mes, anio)', () => {
    it.each([1, 7, 42, 99])('no produce filas duplicadas (seed %i)', (seed) => {
      const filas = repartirHoras(
        800,
        ENERO_2025,
        sumar(ENERO_2025, 8),
        [1, 2],
        lcg(seed),
      );
      const claves = filas.map((f) => `${f.recursoId}:${f.anio}-${f.mes}`);
      expect(new Set(claves).size).toBe(claves.length);
    });
  });

  describe('reproducibilidad', () => {
    it('mismo rng (mismo seed) produce la misma salida', () => {
      const a = repartirHoras(
        500,
        ENERO_2025,
        sumar(ENERO_2025, 5),
        [1, 2, 3],
        lcg(99),
      );
      const b = repartirHoras(
        500,
        ENERO_2025,
        sumar(ENERO_2025, 5),
        [1, 2, 3],
        lcg(99),
      );
      expect(a).toEqual(b);
    });

    it('rngs distintos producen salidas distintas', () => {
      const a = repartirHoras(
        500,
        ENERO_2025,
        sumar(ENERO_2025, 5),
        [1, 2, 3],
        lcg(1),
      );
      const b = repartirHoras(
        500,
        ENERO_2025,
        sumar(ENERO_2025, 5),
        [1, 2, 3],
        lcg(50_000),
      );
      expect(a).not.toEqual(b);
    });
  });

  describe('casos especiales', () => {
    it('1 mes total: suma cuadra con horasTotal', () => {
      const filas = repartirHoras(100, ENERO_2025, ENERO_2025, [1, 2], lcg(1));
      const suma = filas.reduce((a, f) => a + f.horas, 0);
      expect(Math.abs(suma - 100)).toBeLessThan(0.01);
    });

    it('mesFin < mesInicio lanza RepartidorHorasMensualError', () => {
      expect(() =>
        repartirHoras(
          100,
          { mes: 6, anio: 2025 },
          { mes: 5, anio: 2025 },
          [1],
          lcg(1),
        ),
      ).toThrow(RepartidorHorasMensualError);
    });

    it('recursos vacíos lanza RepartidorHorasMensualError', () => {
      expect(() =>
        repartirHoras(100, ENERO_2025, sumar(ENERO_2025, 3), [], lcg(1)),
      ).toThrow(RepartidorHorasMensualError);
    });
  });
});
