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

    const eventos = AgregadorActividad.agregar(pedidos, []);
    expect(eventos).toEqual([
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

    const eventos = AgregadorActividad.agregar(pedidos, [], 5);
    expect(eventos.map((e) => e.tipo)).toEqual([
      'pedido_aprobado',
      'pedido_solicitado',
      'pedido_creado',
    ]);
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

    const eventos = AgregadorActividad.agregar(pedidos, [], 10);
    const tipos = eventos.map((e) => e.tipo);
    expect(tipos).toContain('pedido_actualizado');
    const terminal = eventos.find((e) => e.tipo === 'pedido_actualizado');
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

    const eventos = AgregadorActividad.agregar([], consumos);
    expect(eventos).toEqual([
      {
        tipo: 'consumo_registrado',
        fecha: '2026-05-15T09:00:00Z',
        descripcion: 'Consumo de 40,00 h registrado en pedido #5 (Ada).',
        recurso: { tipo: 'consumo', id: 100 },
      },
    ]);
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

    const eventos = AgregadorActividad.agregar(pedidos, consumos, 10);
    expect(eventos.map((e) => e.fecha)).toEqual([
      '2026-05-03T10:00:00Z',
      '2026-05-02T10:00:00Z',
      '2026-05-01T10:00:00Z',
    ]);

    const limitado = AgregadorActividad.agregar(pedidos, consumos, 2);
    expect(limitado).toHaveLength(2);
    expect(limitado[0].fecha).toBe('2026-05-03T10:00:00Z');
  });
});
