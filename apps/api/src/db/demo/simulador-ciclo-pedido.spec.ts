import { MaquinaEstadosPedido } from '../../pedidos/maquina-estados-pedido';
import type { EstadoPedido } from '../schema';
import {
  CicloImposibleError,
  simularCiclo,
  type Transicion,
} from './simulador-ciclo-pedido';

// rng determinista: LCG simple. Permite verificar reproducibilidad sin
// depender de Faker en los tests del módulo.
function lcg(seed: number): () => number {
  let s = seed % 2_147_483_647;
  if (s <= 0) s += 2_147_483_646;
  return () => {
    s = (s * 16_807) % 2_147_483_647;
    return (s - 1) / 2_147_483_646;
  };
}

const HOY = '2026-05-01';
const HACE_UN_ANIO = '2025-05-01';

describe('simularCiclo', () => {
  describe('secuencia de acciones por estado objetivo', () => {
    const casos: Array<[EstadoPedido, string[]]> = [
      ['Borrador', []],
      ['Solicitado', ['solicitar']],
      ['Aprobado', ['solicitar', 'aprobar']],
      ['EnEjecucion', ['solicitar', 'aprobar']],
      ['Consumido', ['solicitar', 'aprobar']],
      ['Rechazado', ['solicitar', 'rechazar']],
      ['Cancelado', ['solicitar', 'aprobar', 'cancelar']],
    ];
    it.each(casos)('%s → %j', (estado, esperado) => {
      const out = simularCiclo(estado, HACE_UN_ANIO, HOY, lcg(1));
      expect(out.map((t) => t.accion)).toEqual(esperado);
    });
  });

  describe('fechas', () => {
    it('estrictamente crecientes y dentro de (fechaCreacion, hoy]', () => {
      const out = simularCiclo('Cancelado', HACE_UN_ANIO, HOY, lcg(7));
      const fechas = out.map((t) => t.fecha);
      for (let i = 0; i < fechas.length; i++) {
        expect(fechas[i] > HACE_UN_ANIO).toBe(true);
        expect(fechas[i] <= HOY).toBe(true);
        if (i > 0) {
          expect(fechas[i] > fechas[i - 1]).toBe(true);
        }
      }
    });

    it('Borrador no genera fechas', () => {
      const out = simularCiclo('Borrador', HOY, HOY, lcg(1));
      expect(out).toEqual([]);
    });
  });

  describe('validación cruzada con MaquinaEstadosPedido.aplicar', () => {
    const objetivos: EstadoPedido[] = [
      'Solicitado',
      'Aprobado',
      'EnEjecucion',
      'Consumido',
      'Rechazado',
      'Cancelado',
    ];
    it.each(objetivos)(
      'cada paso de %s pasa por aplicar sin lanzar',
      (objetivo) => {
        const out = simularCiclo(objetivo, HACE_UN_ANIO, HOY, lcg(3));
        let estado: EstadoPedido = 'Borrador';
        for (const t of out) {
          expect(() => {
            estado = MaquinaEstadosPedido.aplicar(estado, t.accion);
          }).not.toThrow();
        }
      },
    );
  });

  describe('casos imposibles', () => {
    it('Consumido con fechaCreacion = hoy lanza CicloImposibleError', () => {
      expect(() => simularCiclo('Consumido', HOY, HOY, lcg(1))).toThrow(
        CicloImposibleError,
      );
    });

    it('Cancelado (3 transiciones) con sólo 2 días de margen lanza', () => {
      // 2 días disponibles, 3 acciones → no cabe.
      expect(() =>
        simularCiclo('Cancelado', '2026-04-29', HOY, lcg(1)),
      ).toThrow(CicloImposibleError);
    });

    it('hoy < fechaCreacion lanza CicloImposibleError', () => {
      expect(() =>
        simularCiclo('Solicitado', '2026-06-01', HOY, lcg(1)),
      ).toThrow(CicloImposibleError);
    });
  });

  describe('reproducibilidad', () => {
    it('mismo rng (mismo seed) produce las mismas fechas', () => {
      const a = simularCiclo('Cancelado', HACE_UN_ANIO, HOY, lcg(99));
      const b = simularCiclo('Cancelado', HACE_UN_ANIO, HOY, lcg(99));
      expect(a).toEqual(b);
    });

    it('rngs distintos pueden producir fechas distintas', () => {
      const a = simularCiclo('Cancelado', HACE_UN_ANIO, HOY, lcg(1));
      const b = simularCiclo('Cancelado', HACE_UN_ANIO, HOY, lcg(50_000));
      // Probabilísticamente las fechas deben diferir; con un rango de ~365
      // días y 3 transiciones es prácticamente seguro.
      expect(a.map((t) => t.fecha)).not.toEqual(b.map((t) => t.fecha));
    });
  });

  describe('mínimos justos', () => {
    it('Cancelado con exactamente 3 días disponibles asigna día 1, 2 y 3', () => {
      const out = simularCiclo('Cancelado', '2026-04-28', HOY, lcg(1));
      expect(out.map((t) => t.fecha)).toEqual([
        '2026-04-29',
        '2026-04-30',
        '2026-05-01',
      ]);
      assertSinDuplicados(out);
    });
  });
});

function assertSinDuplicados(transiciones: Transicion[]): void {
  const fechas = transiciones.map((t) => t.fecha);
  expect(new Set(fechas).size).toBe(fechas.length);
}
