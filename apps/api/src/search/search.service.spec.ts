import { makeTestDb } from '../catalogo/testing/db';
import { pedidos, proveedores, proyectos } from '../db/schema';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let close: () => void;
  let service: SearchService;
  let db: ReturnType<typeof makeTestDb>['db'];

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    service = new SearchService(db);
  });

  afterEach(() => close());

  function crearProveedor(nombre: string): number {
    const [row] = db
      .insert(proveedores)
      .values({ nombre })
      .returning()
      .all();
    return row.id;
  }

  function crearProyecto(nombre: string): number {
    const [row] = db
      .insert(proyectos)
      .values({ nombre, fechaInicio: '2026-01-01' })
      .returning()
      .all();
    return row.id;
  }

  function crearPedido(proyectoId: number, proveedorId: number): number {
    const [row] = db
      .insert(pedidos)
      .values({ proyectoId, proveedorId, estado: 'Borrador' })
      .returning()
      .all();
    return row.id;
  }

  it('devuelve listas vacías cuando q es vacío', () => {
    crearProveedor('Acme');
    expect(service.buscar('')).toEqual({
      pedidos: [],
      proyectos: [],
      proveedores: [],
    });
  });

  it('devuelve listas vacías cuando q es solo espacios', () => {
    crearProveedor('Acme');
    expect(service.buscar('   ')).toEqual({
      pedidos: [],
      proyectos: [],
      proveedores: [],
    });
  });

  it('busca proveedores por substring case-insensitive', () => {
    crearProveedor('Acme Consulting');
    crearProveedor('Globex');
    crearProveedor('Acme Logistics');

    const r = service.buscar('acme');

    expect(r.proveedores.map((p) => p.nombre).sort()).toEqual([
      'Acme Consulting',
      'Acme Logistics',
    ]);
  });

  it('busca proyectos por substring', () => {
    crearProyecto('Migración ERP 2026');
    crearProyecto('App móvil');
    crearProyecto('ERP Fase 2');

    const r = service.buscar('ERP');

    expect(r.proyectos.map((p) => p.nombre).sort()).toEqual([
      'ERP Fase 2',
      'Migración ERP 2026',
    ]);
  });

  it('limita a 5 resultados por categoría', () => {
    for (let i = 1; i <= 8; i++) {
      crearProveedor(`Acme ${i}`);
    }

    const r = service.buscar('Acme');

    expect(r.proveedores).toHaveLength(5);
  });

  it('busca pedidos por #ID exacto', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('P1');
    crearPedido(proyectoId, proveedorId);
    crearPedido(proyectoId, proveedorId);
    const id3 = crearPedido(proyectoId, proveedorId);

    const r = service.buscar(`#${id3}`);

    expect(r.pedidos.map((p) => p.id)).toContain(id3);
  });

  it('busca pedidos por ID sin #', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('P1');
    const id = crearPedido(proyectoId, proveedorId);

    const r = service.buscar(String(id));

    expect(r.pedidos.map((p) => p.id)).toContain(id);
  });

  it('busca pedidos por nombre del proyecto asociado', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoMigracion = crearProyecto('Migración ERP');
    const proyectoOtro = crearProyecto('Otro');
    const idA = crearPedido(proyectoMigracion, proveedorId);
    crearPedido(proyectoOtro, proveedorId);

    const r = service.buscar('Migración');

    expect(r.pedidos.map((p) => p.id)).toEqual([idA]);
    expect(r.pedidos[0].proyectoNombre).toBe('Migración ERP');
  });

  it('busca pedidos por nombre del proveedor asociado', () => {
    const acme = crearProveedor('Acme');
    const globex = crearProveedor('Globex');
    const proyectoId = crearProyecto('P1');
    const idA = crearPedido(proyectoId, acme);
    crearPedido(proyectoId, globex);

    const r = service.buscar('Acme');

    expect(r.pedidos.map((p) => p.id)).toEqual([idA]);
    expect(r.pedidos[0].proveedorNombre).toBe('Acme');
  });

  it('hidrata proyecto y proveedor en cada PedidoSearchDto', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('Migración ERP');
    const pedidoId = crearPedido(proyectoId, proveedorId);

    const r = service.buscar('Migración');

    expect(r.pedidos[0]).toMatchObject({
      id: pedidoId,
      estado: 'Borrador',
      proyectoId,
      proyectoNombre: 'Migración ERP',
      proveedorId,
      proveedorNombre: 'Acme',
    });
  });

  it('no devuelve nada cuando la query es solo "#" sin dígitos', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('P1');
    crearPedido(proyectoId, proveedorId);

    const r = service.buscar('#');

    expect(r.pedidos).toEqual([]);
  });

  it('busca todas las categorías a la vez con la misma query', () => {
    const acme = crearProveedor('Acme');
    crearProveedor('Globex');
    const acmeProject = crearProyecto('Acme Internal');
    crearProyecto('Otro');
    crearPedido(acmeProject, acme);

    const r = service.buscar('Acme');

    expect(r.proveedores).toHaveLength(1);
    expect(r.proyectos).toHaveLength(1);
    expect(r.pedidos).toHaveLength(1);
  });
});
