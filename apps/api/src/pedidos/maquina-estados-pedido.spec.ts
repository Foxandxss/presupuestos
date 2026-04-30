import {
  AccionPedido,
  MaquinaEstadosPedido,
  TransicionIlegalError,
} from './maquina-estados-pedido';
import type { EstadoPedido } from '../db/schema';

describe('MaquinaEstadosPedido', () => {
  describe('transiciones manuales legales', () => {
    const casos: Array<[EstadoPedido, AccionPedido, EstadoPedido]> = [
      ['Borrador', 'solicitar', 'Solicitado'],
      ['Solicitado', 'aprobar', 'Aprobado'],
      ['Solicitado', 'rechazar', 'Rechazado'],
      ['Aprobado', 'cancelar', 'Cancelado'],
      ['EnEjecucion', 'cancelar', 'Cancelado'],
    ];
    it.each(casos)(
      '%s + %s → %s',
      (estado, accion, esperado) => {
        expect(MaquinaEstadosPedido.aplicar(estado, accion)).toBe(esperado);
      },
    );
  });

  describe('transiciones manuales ilegales', () => {
    const casos: Array<[EstadoPedido, AccionPedido]> = [
      ['Borrador', 'aprobar'],
      ['Borrador', 'rechazar'],
      ['Borrador', 'cancelar'],
      ['Solicitado', 'solicitar'],
      ['Solicitado', 'cancelar'],
      ['Aprobado', 'solicitar'],
      ['Aprobado', 'aprobar'],
      ['Aprobado', 'rechazar'],
      ['EnEjecucion', 'solicitar'],
      ['EnEjecucion', 'aprobar'],
      ['EnEjecucion', 'rechazar'],
      ['Consumido', 'solicitar'],
      ['Consumido', 'aprobar'],
      ['Consumido', 'rechazar'],
      ['Consumido', 'cancelar'],
      ['Rechazado', 'solicitar'],
      ['Rechazado', 'aprobar'],
      ['Rechazado', 'rechazar'],
      ['Rechazado', 'cancelar'],
      ['Cancelado', 'solicitar'],
      ['Cancelado', 'aprobar'],
      ['Cancelado', 'rechazar'],
      ['Cancelado', 'cancelar'],
    ];
    it.each(casos)('%s + %s lanza TransicionIlegalError', (estado, accion) => {
      expect(() => MaquinaEstadosPedido.aplicar(estado, accion)).toThrow(
        TransicionIlegalError,
      );
    });
  });

  describe('auto-transición: consumo sobre Aprobado', () => {
    it('Aprobado + consumo parcial → EnEjecucion', () => {
      const lineas = [{ horasOfertadas: 100, horasConsumidas: 10 }];
      expect(MaquinaEstadosPedido.estadoTrasConsumo('Aprobado', lineas)).toBe(
        'EnEjecucion',
      );
    });

    it('Aprobado + consumo que completa todas las líneas → Consumido', () => {
      const lineas = [
        { horasOfertadas: 100, horasConsumidas: 100 },
        { horasOfertadas: 50, horasConsumidas: 50 },
      ];
      expect(MaquinaEstadosPedido.estadoTrasConsumo('Aprobado', lineas)).toBe(
        'Consumido',
      );
    });
  });

  describe('auto-transición: consumo sobre EnEjecucion', () => {
    it('EnEjecucion + alguna línea sin agotar → sigue EnEjecucion', () => {
      const lineas = [
        { horasOfertadas: 100, horasConsumidas: 100 },
        { horasOfertadas: 50, horasConsumidas: 30 },
      ];
      expect(
        MaquinaEstadosPedido.estadoTrasConsumo('EnEjecucion', lineas),
      ).toBe('EnEjecucion');
    });

    it('EnEjecucion + todas las líneas agotadas → Consumido', () => {
      const lineas = [
        { horasOfertadas: 100, horasConsumidas: 100 },
        { horasOfertadas: 50, horasConsumidas: 50 },
      ];
      expect(
        MaquinaEstadosPedido.estadoTrasConsumo('EnEjecucion', lineas),
      ).toBe('Consumido');
    });

    it('EnEjecucion sin líneas → conserva EnEjecucion (no marca Consumido)', () => {
      expect(MaquinaEstadosPedido.estadoTrasConsumo('EnEjecucion', [])).toBe(
        'EnEjecucion',
      );
    });
  });

  describe('estadoTrasConsumo lanza sobre estados inválidos', () => {
    it.each<EstadoPedido>([
      'Borrador',
      'Solicitado',
      'Consumido',
      'Rechazado',
      'Cancelado',
    ])('estado %s lanza TransicionIlegalError', (estado) => {
      expect(() =>
        MaquinaEstadosPedido.estadoTrasConsumo(estado, []),
      ).toThrow(TransicionIlegalError);
    });
  });
});
