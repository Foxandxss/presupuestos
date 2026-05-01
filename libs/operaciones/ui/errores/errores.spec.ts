import { mapearErrorACopy } from './errores';

describe('mapearErrorACopy', () => {
  it('transicion_ilegal → copy específico', () => {
    expect(
      mapearErrorACopy({
        code: 'transicion_ilegal',
        message: "No se puede 'aprobar' un pedido en estado 'Borrador'",
      }),
    ).toBe(
      'No es posible realizar esa transición sobre el pedido en su estado actual.',
    );
  });

  it('pedido_no_activo → copy específico', () => {
    expect(
      mapearErrorACopy({
        code: 'pedido_no_activo',
        message: 'cualquier mensaje del backend',
      }),
    ).toBe('El pedido no admite registros de consumo en su estado actual.');
  });

  it('recurso_otro_proveedor → copy específico', () => {
    expect(
      mapearErrorACopy({
        code: 'recurso_otro_proveedor',
        message: 'mensaje original',
      }),
    ).toBe('El recurso seleccionado no pertenece al proveedor del pedido.');
  });

  it('mes_fuera_de_ventana → copy específico', () => {
    expect(
      mapearErrorACopy({
        code: 'mes_fuera_de_ventana',
        message: 'mensaje original',
      }),
    ).toBe('El mes elegido cae fuera de la ventana de la línea.');
  });

  it('consumo_duplicado → copy específico', () => {
    expect(
      mapearErrorACopy({
        code: 'consumo_duplicado',
        message: 'mensaje original',
      }),
    ).toBe(
      'Ya existe un consumo para esa combinación de línea, recurso, mes y año.',
    );
  });

  it('excede_horas_ofertadas con fields.disponibles=27 → interpola el número', () => {
    expect(
      mapearErrorACopy({
        code: 'excede_horas_ofertadas',
        message: 'mensaje original',
        fields: { disponibles: 27 },
      }),
    ).toBe(
      'Sobrepasa el límite de horas ofertadas (quedan 27 h disponibles).',
    );
  });

  it('excede_horas_ofertadas con fields.disponibles=0 → interpola correctamente', () => {
    expect(
      mapearErrorACopy({
        code: 'excede_horas_ofertadas',
        message: 'mensaje original',
        fields: { disponibles: 0 },
      }),
    ).toBe('Sobrepasa el límite de horas ofertadas (quedan 0 h disponibles).');
  });

  it('excede_horas_ofertadas sin fields → fallback sin número', () => {
    expect(
      mapearErrorACopy({
        code: 'excede_horas_ofertadas',
        message: 'mensaje original',
      }),
    ).toBe('Sobrepasa el límite de horas ofertadas.');
  });

  it('proyecto_con_pedidos → copy específico con CTA', () => {
    expect(
      mapearErrorACopy({
        code: 'proyecto_con_pedidos',
        message: 'mensaje original',
      }),
    ).toBe(
      'No se puede eliminar: el proyecto tiene pedidos asociados. Cancela los pedidos antes.',
    );
  });

  it('código desconocido → cae en error.message', () => {
    expect(
      mapearErrorACopy({
        code: 'algo_raro',
        message: 'Mensaje del servidor sin tratar',
      }),
    ).toBe('Mensaje del servidor sin tratar');
  });

  it('código not_found genérico → cae en error.message', () => {
    expect(
      mapearErrorACopy({
        code: 'not_found',
        message: 'Pedido 42 no encontrado',
      }),
    ).toBe('Pedido 42 no encontrado');
  });
});
