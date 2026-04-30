import {
  ContextoValidacionConsumo,
  PropuestaConsumo,
  ValidacionConsumoError,
  ValidadorConsumo,
} from './validador-consumo';

function ctx(
  override: Partial<ContextoValidacionConsumo> = {},
): ContextoValidacionConsumo {
  return {
    estadoPedido: 'Aprobado',
    proveedorIdPedido: 1,
    proveedorIdRecurso: 1,
    fechaInicioLinea: '2026-04-01',
    fechaFinLinea: '2026-09-30',
    horasOfertadasLinea: 100,
    horasYaConsumidasLinea: 0,
    duplicado: false,
    ...override,
  };
}

function propuesta(
  override: Partial<PropuestaConsumo> = {},
): PropuestaConsumo {
  return { mes: 5, anio: 2026, horas: 20, ...override };
}

describe('ValidadorConsumo', () => {
  it('acepta una propuesta válida sobre pedido Aprobado', () => {
    expect(() => ValidadorConsumo.validar(propuesta(), ctx())).not.toThrow();
  });

  it('acepta una propuesta válida sobre pedido EnEjecucion', () => {
    expect(() =>
      ValidadorConsumo.validar(propuesta(), ctx({ estadoPedido: 'EnEjecucion' })),
    ).not.toThrow();
  });

  describe('estado del pedido', () => {
    it('rechaza pedido en Borrador con motivo pedido_no_activo', () => {
      try {
        ValidadorConsumo.validar(propuesta(), ctx({ estadoPedido: 'Borrador' }));
        fail('debería lanzar');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidacionConsumoError);
        expect((err as ValidacionConsumoError).motivo).toBe('pedido_no_activo');
      }
    });

    it.each(['Solicitado', 'Consumido', 'Rechazado', 'Cancelado'] as const)(
      'rechaza pedido en %s',
      (estado) => {
        expect(() =>
          ValidadorConsumo.validar(propuesta(), ctx({ estadoPedido: estado })),
        ).toThrow(ValidacionConsumoError);
      },
    );
  });

  describe('pertenencia del recurso', () => {
    it('rechaza recurso de otro proveedor', () => {
      try {
        ValidadorConsumo.validar(
          propuesta(),
          ctx({ proveedorIdPedido: 1, proveedorIdRecurso: 2 }),
        );
        fail();
      } catch (err) {
        expect((err as ValidacionConsumoError).motivo).toBe(
          'recurso_otro_proveedor',
        );
      }
    });
  });

  describe('ventana de fechas de la línea', () => {
    it('rechaza mes anterior al fechaInicio', () => {
      try {
        ValidadorConsumo.validar(propuesta({ mes: 3, anio: 2026 }), ctx());
        fail();
      } catch (err) {
        expect((err as ValidacionConsumoError).motivo).toBe(
          'mes_fuera_de_ventana',
        );
      }
    });

    it('rechaza mes posterior al fechaFin', () => {
      try {
        ValidadorConsumo.validar(propuesta({ mes: 10, anio: 2026 }), ctx());
        fail();
      } catch (err) {
        expect((err as ValidacionConsumoError).motivo).toBe(
          'mes_fuera_de_ventana',
        );
      }
    });

    it('acepta el mes exacto del inicio', () => {
      expect(() =>
        ValidadorConsumo.validar(propuesta({ mes: 4, anio: 2026 }), ctx()),
      ).not.toThrow();
    });

    it('acepta el mes exacto del fin', () => {
      expect(() =>
        ValidadorConsumo.validar(propuesta({ mes: 9, anio: 2026 }), ctx()),
      ).not.toThrow();
    });

    it('rechaza otro año fuera del rango', () => {
      expect(() =>
        ValidadorConsumo.validar(propuesta({ mes: 5, anio: 2025 }), ctx()),
      ).toThrow(ValidacionConsumoError);
      expect(() =>
        ValidadorConsumo.validar(propuesta({ mes: 5, anio: 2027 }), ctx()),
      ).toThrow(ValidacionConsumoError);
    });
  });

  describe('duplicados', () => {
    it('rechaza con motivo consumo_duplicado cuando ya existe registro para el slot', () => {
      try {
        ValidadorConsumo.validar(propuesta(), ctx({ duplicado: true }));
        fail();
      } catch (err) {
        expect((err as ValidacionConsumoError).motivo).toBe(
          'consumo_duplicado',
        );
      }
    });
  });

  describe('overflow de horas ofertadas', () => {
    it('rechaza si la suma con previas excede horas ofertadas', () => {
      try {
        ValidadorConsumo.validar(
          propuesta({ horas: 30 }),
          ctx({ horasOfertadasLinea: 100, horasYaConsumidasLinea: 80 }),
        );
        fail();
      } catch (err) {
        expect((err as ValidacionConsumoError).motivo).toBe(
          'excede_horas_ofertadas',
        );
      }
    });

    it('acepta si el total iguala las ofertadas (cierra la línea exactamente)', () => {
      expect(() =>
        ValidadorConsumo.validar(
          propuesta({ horas: 20 }),
          ctx({ horasOfertadasLinea: 100, horasYaConsumidasLinea: 80 }),
        ),
      ).not.toThrow();
    });
  });
});
