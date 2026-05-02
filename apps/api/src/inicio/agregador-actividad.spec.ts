import {
  AgregadorActividad,
  type ConsumoParaActividad,
  type PedidoParaActividad,
} from './agregador-actividad';

describe('AgregadorActividad', () => {
  it('emite evento de creación por cada pedido', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        estado: 'Borrador',
        proyectoNombre: 'Migración core',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-01T10:00:00Z',
        updatedAt: '2026-05-01T10:00:00Z',
        fechaSolicitud: null,
        fechaAprobacion: null,
      },
    ];

    const pagina = AgregadorActividad.agregar(pedidos, []);
    expect(pagina.total).toBe(1);
    expect(pagina.items).toEqual([
      {
        tipo: 'pedido_creado',
        fecha: '2026-05-01T10:00:00Z',
        descripcion: 'Pedido #1 creado en Migración core (Acme).',
        recurso: { tipo: 'pedido', id: 1 },
      },
    ]);
  });

  it('emite eventos solicitado/aprobado cuando hay fechas', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 42,
        estado: 'Aprobado',
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-04-01T10:00:00Z',
        updatedAt: '2026-04-15T12:00:00Z',
        fechaSolicitud: '2026-04-10T10:00:00Z',
        fechaAprobacion: '2026-04-15T12:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar(pedidos, [], { limit: 5 });
    expect(pagina.items.map((e) => e.tipo)).toEqual([
      'pedido_aprobado',
      'pedido_solicitado',
      'pedido_creado',
    ]);
    expect(pagina.total).toBe(3);
  });

  it('emite evento terminal cuando estado es Cancelado/Rechazado/Consumido y updatedAt es nuevo', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 7,
        estado: 'Cancelado',
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-04-01T10:00:00Z',
        updatedAt: '2026-04-20T15:00:00Z',
        fechaSolicitud: '2026-04-05T10:00:00Z',
        fechaAprobacion: '2026-04-10T10:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar(pedidos, [], { limit: 10 });
    const tipos = pagina.items.map((e) => e.tipo);
    expect(tipos).toContain('pedido_actualizado');
    const terminal = pagina.items.find((e) => e.tipo === 'pedido_actualizado');
    expect(terminal?.descripcion).toBe('Pedido #7: cancelado.');
  });

  it('emite evento por cada consumo registrado', () => {
    const consumos: ConsumoParaActividad[] = [
      {
        id: 100,
        pedidoId: 5,
        proyectoNombre: 'Migración',
        recursoNombre: 'Ada',
        mes: 5,
        anio: 2026,
        horasConsumidas: 40,
        createdAt: '2026-05-15T09:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar([], consumos);
    expect(pagina.items).toEqual([
      {
        tipo: 'consumo_registrado',
        fecha: '2026-05-15T09:00:00Z',
        descripcion: 'Consumo de 40,00 h registrado en pedido #5 (Ada).',
        recurso: { tipo: 'consumo', id: 100 },
      },
    ]);
    expect(pagina.total).toBe(1);
  });

  it('ordena por fecha desc y respeta el limit', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        estado: 'Borrador',
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-01T10:00:00Z',
        updatedAt: '2026-05-01T10:00:00Z',
        fechaSolicitud: null,
        fechaAprobacion: null,
      },
      {
        id: 2,
        estado: 'Borrador',
        proyectoNombre: 'P2',
        proveedorNombre: 'Globex',
        createdAt: '2026-05-03T10:00:00Z',
        updatedAt: '2026-05-03T10:00:00Z',
        fechaSolicitud: null,
        fechaAprobacion: null,
      },
    ];
    const consumos: ConsumoParaActividad[] = [
      {
        id: 100,
        pedidoId: 1,
        proyectoNombre: 'P1',
        recursoNombre: 'Ada',
        mes: 5,
        anio: 2026,
        horasConsumidas: 10,
        createdAt: '2026-05-02T10:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar(pedidos, consumos, { limit: 10 });
    expect(pagina.items.map((e) => e.fecha)).toEqual([
      '2026-05-03T10:00:00Z',
      '2026-05-02T10:00:00Z',
      '2026-05-01T10:00:00Z',
    ]);
    expect(pagina.total).toBe(3);

    const limitado = AgregadorActividad.agregar(pedidos, consumos, { limit: 2 });
    expect(limitado.items).toHaveLength(2);
    expect(limitado.items[0].fecha).toBe('2026-05-03T10:00:00Z');
    expect(limitado.total).toBe(3);
  });

  it('filtra por tipo (whitelist) preservando el orden', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        estado: 'Aprobado',
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-04-01T10:00:00Z',
        updatedAt: '2026-04-15T12:00:00Z',
        fechaSolicitud: '2026-04-10T10:00:00Z',
        fechaAprobacion: '2026-04-15T12:00:00Z',
      },
    ];
    const consumos: ConsumoParaActividad[] = [
      {
        id: 100,
        pedidoId: 1,
        proyectoNombre: 'P1',
        recursoNombre: 'Ada',
        mes: 5,
        anio: 2026,
        horasConsumidas: 10,
        createdAt: '2026-05-02T10:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar(pedidos, consumos, {
      limit: 10,
      tipo: ['pedido_creado', 'consumo_registrado'],
    });

    expect(pagina.items.map((e) => e.tipo)).toEqual([
      'consumo_registrado',
      'pedido_creado',
    ]);
    expect(pagina.total).toBe(2);
  });

  it('filtra por desde/hasta inclusivo y ajusta el total', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        estado: 'Borrador',
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-04-15T10:00:00Z',
        updatedAt: '2026-04-15T10:00:00Z',
        fechaSolicitud: null,
        fechaAprobacion: null,
      },
      {
        id: 2,
        estado: 'Borrador',
        proyectoNombre: 'P2',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-10T10:00:00Z',
        updatedAt: '2026-05-10T10:00:00Z',
        fechaSolicitud: null,
        fechaAprobacion: null,
      },
      {
        id: 3,
        estado: 'Borrador',
        proyectoNombre: 'P3',
        proveedorNombre: 'Acme',
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z',
        fechaSolicitud: null,
        fechaAprobacion: null,
      },
    ];

    const pagina = AgregadorActividad.agregar(pedidos, [], {
      desde: '2026-05-01T00:00:00Z',
      hasta: '2026-05-31T23:59:59Z',
    });

    expect(pagina.total).toBe(1);
    expect(pagina.items.map((e) => e.recurso.id)).toEqual([2]);
  });

  it('paginación: respeta offset + limit y devuelve total real', () => {
    const consumos: ConsumoParaActividad[] = Array.from({ length: 7 }, (_, i) => ({
      id: i + 1,
      pedidoId: 1,
      proyectoNombre: 'P',
      recursoNombre: 'R',
      mes: 1,
      anio: 2026,
      horasConsumidas: 1,
      // Fechas crecientes — el orden desc deja id=7 primero, id=1 último.
      createdAt: `2026-01-0${i + 1}T10:00:00Z`,
    }));

    const pagina = AgregadorActividad.agregar([], consumos, {
      limit: 3,
      offset: 2,
    });

    expect(pagina.total).toBe(7);
    expect(pagina.items.map((e) => e.recurso.id)).toEqual([5, 4, 3]);
  });
});
