import {
  AgregadorActividad,
  type ConsumoParaActividad,
  type HistorialParaActividad,
  type PedidoParaActividad,
  type ProyectoParaActividad,
} from './agregador-actividad';

const NO_CONSUMOS: ConsumoParaActividad[] = [];
const NO_HISTORIAL: HistorialParaActividad[] = [];
const NO_PROYECTOS: ProyectoParaActividad[] = [];

describe('AgregadorActividad', () => {
  it('emite evento de creación por cada pedido', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        proyectoNombre: 'Migración core',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-01T10:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar(
      pedidos,
      NO_CONSUMOS,
      NO_HISTORIAL,
      NO_PROYECTOS,
    );
    expect(pagina.total).toBe(1);
    expect(pagina.items).toEqual([
      {
        tipo: 'pedido_creado',
        fecha: '2026-05-01T10:00:00Z',
        descripcion: 'Pedido #1 creado en Migración core (Acme).',
        recurso: { tipo: 'pedido', id: 1 },
        accion: null,
        usuarioId: null,
        usuarioEmail: null,
      },
    ]);
  });

  it('emite pedido_transicion por cada fila de historial con accion solicitar/aprobar/rechazar/cancelar', () => {
    const historial: HistorialParaActividad[] = [
      {
        pedidoId: 42,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estadoAnterior: 'Borrador',
        estadoNuevo: 'Solicitado',
        accion: 'solicitar',
        fecha: '2026-04-10T10:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'admin@demo.com',
      },
      {
        pedidoId: 42,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estadoAnterior: 'Solicitado',
        estadoNuevo: 'Aprobado',
        accion: 'aprobar',
        fecha: '2026-04-15T12:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'admin@demo.com',
      },
    ];

    const pagina = AgregadorActividad.agregar(
      [],
      NO_CONSUMOS,
      historial,
      NO_PROYECTOS,
      { limit: 10 },
    );
    expect(pagina.total).toBe(2);
    expect(pagina.items.map((e) => e.tipo)).toEqual([
      'pedido_transicion',
      'pedido_transicion',
    ]);
    expect(pagina.items.map((e) => e.accion)).toEqual(['aprobar', 'solicitar']);
    expect(pagina.items.map((e) => e.descripcion)).toEqual([
      'Pedido #42 aprobado.',
      'Pedido #42 solicitado.',
    ]);
    expect(pagina.items[0].usuarioEmail).toBe('admin@demo.com');
  });

  it('omite consumo_inicial / consumo_completo del feed (redundantes con consumo_registrado)', () => {
    const historial: HistorialParaActividad[] = [
      {
        pedidoId: 1,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estadoAnterior: 'Aprobado',
        estadoNuevo: 'EnEjecucion',
        accion: 'consumo_inicial',
        fecha: '2026-05-01T10:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'a@a.com',
      },
      {
        pedidoId: 1,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estadoAnterior: 'EnEjecucion',
        estadoNuevo: 'Consumido',
        accion: 'consumo_completo',
        fecha: '2026-05-02T10:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'a@a.com',
      },
    ];
    const pagina = AgregadorActividad.agregar(
      [],
      NO_CONSUMOS,
      historial,
      NO_PROYECTOS,
    );
    expect(pagina.total).toBe(0);
    expect(pagina.items).toEqual([]);
  });

  it('emite consumo_eliminado por accion=consumo_borrado', () => {
    const historial: HistorialParaActividad[] = [
      {
        pedidoId: 5,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estadoAnterior: 'Consumido',
        estadoNuevo: 'EnEjecucion',
        accion: 'consumo_borrado',
        fecha: '2026-05-10T09:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'admin@demo.com',
      },
    ];
    const pagina = AgregadorActividad.agregar(
      [],
      NO_CONSUMOS,
      historial,
      NO_PROYECTOS,
    );
    expect(pagina.total).toBe(1);
    expect(pagina.items[0]).toEqual({
      tipo: 'consumo_eliminado',
      fecha: '2026-05-10T09:00:00Z',
      descripcion: 'Consumo eliminado del pedido #5 (P1).',
      recurso: { tipo: 'pedido', id: 5 },
      accion: 'consumo_borrado',
      usuarioId: 7,
      usuarioEmail: 'admin@demo.com',
    });
  });

  it('emite proyecto_creado por cada proyecto', () => {
    const proyectos: ProyectoParaActividad[] = [
      {
        id: 3,
        nombre: 'Migración v2',
        createdAt: '2026-05-01T08:00:00Z',
      },
    ];
    const pagina = AgregadorActividad.agregar(
      [],
      NO_CONSUMOS,
      NO_HISTORIAL,
      proyectos,
    );
    expect(pagina.items).toEqual([
      {
        tipo: 'proyecto_creado',
        fecha: '2026-05-01T08:00:00Z',
        descripcion: 'Proyecto Migración v2 creado.',
        recurso: { tipo: 'proyecto', id: 3 },
        accion: null,
        usuarioId: null,
        usuarioEmail: null,
      },
    ]);
  });

  it('emite consumo_registrado con usuarioEmail joineado', () => {
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
        usuarioId: 7,
        usuarioEmail: 'consultor@demo.com',
      },
    ];
    const pagina = AgregadorActividad.agregar(
      [],
      consumos,
      NO_HISTORIAL,
      NO_PROYECTOS,
    );
    expect(pagina.items).toEqual([
      {
        tipo: 'consumo_registrado',
        fecha: '2026-05-15T09:00:00Z',
        descripcion: 'Consumo de 40,00 h registrado en pedido #5 (Ada).',
        recurso: { tipo: 'consumo', id: 100 },
        accion: null,
        usuarioId: 7,
        usuarioEmail: 'consultor@demo.com',
      },
    ]);
  });

  it('ordena por fecha desc y respeta el limit', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-01T10:00:00Z',
      },
      {
        id: 2,
        proyectoNombre: 'P2',
        proveedorNombre: 'Globex',
        createdAt: '2026-05-03T10:00:00Z',
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
        usuarioId: null,
        usuarioEmail: null,
      },
    ];

    const pagina = AgregadorActividad.agregar(
      pedidos,
      consumos,
      NO_HISTORIAL,
      NO_PROYECTOS,
      { limit: 10 },
    );
    expect(pagina.items.map((e) => e.fecha)).toEqual([
      '2026-05-03T10:00:00Z',
      '2026-05-02T10:00:00Z',
      '2026-05-01T10:00:00Z',
    ]);
    expect(pagina.total).toBe(3);

    const limitado = AgregadorActividad.agregar(
      pedidos,
      consumos,
      NO_HISTORIAL,
      NO_PROYECTOS,
      { limit: 2 },
    );
    expect(limitado.items).toHaveLength(2);
    expect(limitado.items[0].fecha).toBe('2026-05-03T10:00:00Z');
    expect(limitado.total).toBe(3);
  });

  it('filtra por tipo (whitelist) preservando el orden', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-04-01T10:00:00Z',
      },
    ];
    const historial: HistorialParaActividad[] = [
      {
        pedidoId: 1,
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estadoAnterior: 'Borrador',
        estadoNuevo: 'Solicitado',
        accion: 'solicitar',
        fecha: '2026-04-05T10:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'a@a.com',
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
        usuarioId: null,
        usuarioEmail: null,
      },
    ];

    const pagina = AgregadorActividad.agregar(
      pedidos,
      consumos,
      historial,
      NO_PROYECTOS,
      {
        limit: 10,
        tipo: ['pedido_creado', 'consumo_registrado'],
      },
    );

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
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        createdAt: '2026-04-15T10:00:00Z',
      },
      {
        id: 2,
        proyectoNombre: 'P2',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-10T10:00:00Z',
      },
      {
        id: 3,
        proyectoNombre: 'P3',
        proveedorNombre: 'Acme',
        createdAt: '2026-06-01T10:00:00Z',
      },
    ];

    const pagina = AgregadorActividad.agregar(
      pedidos,
      NO_CONSUMOS,
      NO_HISTORIAL,
      NO_PROYECTOS,
      {
        desde: '2026-05-01T00:00:00Z',
        hasta: '2026-05-31T23:59:59Z',
      },
    );

    expect(pagina.total).toBe(1);
    expect(pagina.items.map((e) => e.recurso.id)).toEqual([2]);
  });

  it('filtra por substring case-insensitive de la descripción', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 1,
        proyectoNombre: 'Migración',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-01T10:00:00Z',
      },
      {
        id: 2,
        proyectoNombre: 'Otros',
        proveedorNombre: 'Globex',
        createdAt: '2026-05-02T10:00:00Z',
      },
    ];
    const pagina = AgregadorActividad.agregar(
      pedidos,
      NO_CONSUMOS,
      NO_HISTORIAL,
      NO_PROYECTOS,
      { q: 'globex' },
    );
    expect(pagina.total).toBe(1);
    expect(pagina.items[0].recurso.id).toBe(2);
  });

  it('filtra por usuarioId actor', () => {
    const consumos: ConsumoParaActividad[] = [
      {
        id: 1,
        pedidoId: 1,
        proyectoNombre: 'P',
        recursoNombre: 'R',
        mes: 1,
        anio: 2026,
        horasConsumidas: 5,
        createdAt: '2026-05-01T10:00:00Z',
        usuarioId: 7,
        usuarioEmail: 'siete@a.com',
      },
      {
        id: 2,
        pedidoId: 1,
        proyectoNombre: 'P',
        recursoNombre: 'R',
        mes: 2,
        anio: 2026,
        horasConsumidas: 3,
        createdAt: '2026-05-02T10:00:00Z',
        usuarioId: 9,
        usuarioEmail: 'nueve@a.com',
      },
    ];
    const pagina = AgregadorActividad.agregar(
      [],
      consumos,
      NO_HISTORIAL,
      NO_PROYECTOS,
      { usuarioId: 7 },
    );
    expect(pagina.total).toBe(1);
    expect(pagina.items[0].recurso.id).toBe(1);
  });

  it('filtra por pedidoId (eventos cuyo recurso pedido coincide)', () => {
    const pedidos: PedidoParaActividad[] = [
      {
        id: 10,
        proyectoNombre: 'P',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-01T10:00:00Z',
      },
      {
        id: 11,
        proyectoNombre: 'P',
        proveedorNombre: 'Acme',
        createdAt: '2026-05-02T10:00:00Z',
      },
    ];
    const historial: HistorialParaActividad[] = [
      {
        pedidoId: 10,
        proyectoNombre: 'P',
        proveedorNombre: 'Acme',
        estadoAnterior: 'Borrador',
        estadoNuevo: 'Solicitado',
        accion: 'solicitar',
        fecha: '2026-05-03T10:00:00Z',
        usuarioId: null,
        usuarioEmail: null,
      },
    ];
    const pagina = AgregadorActividad.agregar(
      pedidos,
      NO_CONSUMOS,
      historial,
      NO_PROYECTOS,
      { pedidoId: 10 },
    );
    expect(pagina.total).toBe(2);
    expect(pagina.items.map((e) => e.recurso.id)).toEqual([10, 10]);
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
      usuarioId: null,
      usuarioEmail: null,
    }));

    const pagina = AgregadorActividad.agregar(
      [],
      consumos,
      NO_HISTORIAL,
      NO_PROYECTOS,
      {
        limit: 3,
        offset: 2,
      },
    );

    expect(pagina.total).toBe(7);
    expect(pagina.items.map((e) => e.recurso.id)).toEqual([5, 4, 3]);
  });
});
