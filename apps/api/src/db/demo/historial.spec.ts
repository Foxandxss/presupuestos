import { makeTestDb } from '../../catalogo/testing/db';
import { historialPedido, pedidos, proveedores, proyectos } from '../schema';
import { sembrarHistorialReconstruido } from './historial';

describe('sembrarHistorialReconstruido', () => {
  let close: () => void;
  let db: ReturnType<typeof makeTestDb>['db'];

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    db.insert(proveedores).values({ nombre: 'Acme' }).run();
    db.insert(proyectos)
      .values({ nombre: 'P1', fechaInicio: '2026-01-01' })
      .run();
  });

  afterEach(() => {
    close();
  });

  function insertarPedido(args: {
    estado:
      | 'Borrador'
      | 'Solicitado'
      | 'Aprobado'
      | 'EnEjecucion'
      | 'Consumido'
      | 'Rechazado'
      | 'Cancelado';
    fechaSolicitud?: string;
    fechaAprobacion?: string;
    updatedAt: string;
  }): number {
    const [row] = db
      .insert(pedidos)
      .values({
        proyectoId: 1,
        proveedorId: 1,
        estado: args.estado,
        fechaSolicitud: args.fechaSolicitud ?? null,
        fechaAprobacion: args.fechaAprobacion ?? null,
        updatedAt: args.updatedAt,
      })
      .returning()
      .all();
    return row.id;
  }

  it('Borrador sin fechas no produce filas', () => {
    insertarPedido({ estado: 'Borrador', updatedAt: '2026-01-15 00:00:00' });
    sembrarHistorialReconstruido(db);
    expect(db.select().from(historialPedido).all()).toHaveLength(0);
  });

  it('Solicitado escribe Borrador→Solicitado', () => {
    const id = insertarPedido({
      estado: 'Solicitado',
      fechaSolicitud: '2026-02-10',
      updatedAt: '2026-02-10 00:00:00',
    });
    sembrarHistorialReconstruido(db);
    const filas = db.select().from(historialPedido).all();
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({
      pedidoId: id,
      accion: 'solicitar',
      reconstruido: true,
      fecha: '2026-02-10',
    });
  });

  it('Aprobado escribe solicitar + aprobar', () => {
    insertarPedido({
      estado: 'Aprobado',
      fechaSolicitud: '2026-02-10',
      fechaAprobacion: '2026-02-15',
      updatedAt: '2026-02-15 00:00:00',
    });
    sembrarHistorialReconstruido(db);
    const acciones = db
      .select()
      .from(historialPedido)
      .all()
      .map((r) => r.accion);
    expect(acciones).toEqual(['solicitar', 'aprobar']);
  });

  it('Consumido escribe solicitar + aprobar + consumo_inicial + consumo_completo', () => {
    insertarPedido({
      estado: 'Consumido',
      fechaSolicitud: '2026-02-10',
      fechaAprobacion: '2026-02-15',
      updatedAt: '2026-04-30 00:00:00',
    });
    sembrarHistorialReconstruido(db);
    const acciones = db
      .select()
      .from(historialPedido)
      .all()
      .map((r) => r.accion);
    expect(acciones).toEqual([
      'solicitar',
      'aprobar',
      'consumo_inicial',
      'consumo_completo',
    ]);
  });

  it('todas las filas tienen reconstruido=true y usuarioId=null', () => {
    insertarPedido({
      estado: 'Cancelado',
      fechaSolicitud: '2026-02-10',
      fechaAprobacion: '2026-02-15',
      updatedAt: '2026-03-01 00:00:00',
    });
    sembrarHistorialReconstruido(db);
    const filas = db.select().from(historialPedido).all();
    expect(filas.every((f) => f.reconstruido === true)).toBe(true);
    expect(filas.every((f) => f.usuarioId === null)).toBe(true);
  });
});
