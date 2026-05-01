import { eq } from 'drizzle-orm';

import { makeTestDb } from '../catalogo/testing/db';
import {
  consumosMensuales,
  perfilesTecnicos,
  proveedores,
  proyectos,
  recursos,
  servicios,
  usuarios,
} from '../db/schema';
import { PedidosService } from '../pedidos/pedidos.service';
import { ResolutorTarifa } from '../pedidos/resolutor-tarifa';
import { ConsumosService } from '../consumos/consumos.service';
import { InicioService } from './inicio.service';

describe('InicioService (integration)', () => {
  let close: () => void;
  let db: ReturnType<typeof makeTestDb>['db'];
  let service: InicioService;
  let consumos: ConsumosService;
  let pedidosService: PedidosService;

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    service = new InicioService(db);
    consumos = new ConsumosService(db);
    pedidosService = new PedidosService(db, new ResolutorTarifa(db));
  });

  afterEach(() => {
    close();
  });

  function setupBase() {
    const [proveedor] = db
      .insert(proveedores)
      .values({ nombre: 'Acme' })
      .returning()
      .all();
    const [proyecto] = db
      .insert(proyectos)
      .values({ nombre: 'P1', fechaInicio: '2026-01-01' })
      .returning()
      .all();
    const [perfil] = db
      .insert(perfilesTecnicos)
      .values({ nombre: 'Senior' })
      .returning()
      .all();
    db.insert(servicios)
      .values({
        proveedorId: proveedor.id,
        perfilTecnicoId: perfil.id,
        tarifaPorHora: 50,
      })
      .run();
    const [recurso] = db
      .insert(recursos)
      .values({ nombre: 'Ada', proveedorId: proveedor.id })
      .returning()
      .all();
    const [usuario] = db
      .insert(usuarios)
      .values({
        email: 'a@a.com',
        passwordHash: 'x',
        rol: 'consultor',
      })
      .returning()
      .all();
    return { proveedor, proyecto, perfil, recurso, usuario };
  }

  it('actividad mezcla creaciones de pedido, transiciones y consumos en orden cronológico', () => {
    const { proveedor, proyecto, perfil, recurso, usuario } = setupBase();
    const pedido = pedidosService.create({
      proyectoId: proyecto.id,
      proveedorId: proveedor.id,
      lineas: [
        {
          perfilTecnicoId: perfil.id,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-08-31',
          horasOfertadas: 100,
        },
      ],
    });
    pedidosService.transitar(pedido.id, 'solicitar');
    pedidosService.transitar(pedido.id, 'aprobar');
    const linea = pedido.lineas[0];
    consumos.create(
      {
        lineaPedidoId: linea.id,
        recursoId: recurso.id,
        mes: 5,
        anio: 2026,
        horasConsumidas: 40,
      },
      usuario.id,
    );

    const eventos = service.actividad(20);
    const tipos = eventos.map((e) => e.tipo);

    expect(tipos).toContain('pedido_creado');
    expect(tipos).toContain('pedido_solicitado');
    expect(tipos).toContain('pedido_aprobado');
    expect(tipos).toContain('consumo_registrado');

    // ordenado por fecha desc — el primer evento es el más reciente
    for (let i = 0; i < eventos.length - 1; i++) {
      expect(eventos[i].fecha >= eventos[i + 1].fecha).toBe(true);
    }
  });

  it('actividad respeta el limit', () => {
    const { proveedor, proyecto, perfil } = setupBase();
    pedidosService.create({
      proyectoId: proyecto.id,
      proveedorId: proveedor.id,
      lineas: [
        {
          perfilTecnicoId: perfil.id,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-08-31',
          horasOfertadas: 100,
        },
      ],
    });

    expect(service.actividad(0)).toEqual([]);
    expect(service.actividad(1)).toHaveLength(1);
  });

  it('kpisAdmin con dataset vacío devuelve ceros', () => {
    const k = service.kpisAdmin();
    expect(k.pendientesAprobacion).toBe(0);
    expect(k.enEjecucion).toBe(0);
    expect(k.facturacionMes).toBe(0);
    expect(k.horasMesConsumidas).toBe(0);
    expect(k.facturacionMesDelta).toBeNull();
  });

  it('kpisAdmin cuenta solicitados y en ejecución', () => {
    const { proveedor, proyecto, perfil } = setupBase();
    const a = pedidosService.create({
      proyectoId: proyecto.id,
      proveedorId: proveedor.id,
      lineas: [
        {
          perfilTecnicoId: perfil.id,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-08-31',
          horasOfertadas: 100,
        },
      ],
    });
    pedidosService.transitar(a.id, 'solicitar');

    const k = service.kpisAdmin();
    expect(k.pendientesAprobacion).toBe(1);
    expect(k.enEjecucion).toBe(0);
  });

  it('kpisConsultor filtra horas por usuarioId del request', () => {
    const { proveedor, proyecto, perfil, recurso, usuario } = setupBase();
    const [otroUsuario] = db
      .insert(usuarios)
      .values({ email: 'b@b.com', passwordHash: 'x', rol: 'consultor' })
      .returning()
      .all();

    const pedido = pedidosService.create({
      proyectoId: proyecto.id,
      proveedorId: proveedor.id,
      lineas: [
        {
          perfilTecnicoId: perfil.id,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-08-31',
          horasOfertadas: 100,
        },
      ],
    });
    pedidosService.transitar(pedido.id, 'solicitar');
    pedidosService.transitar(pedido.id, 'aprobar');
    const linea = pedido.lineas[0];

    const now = new Date();
    const mes = now.getUTCMonth() + 1;
    const anio = now.getUTCFullYear();

    consumos.create(
      {
        lineaPedidoId: linea.id,
        recursoId: recurso.id,
        mes,
        anio,
        horasConsumidas: 40,
      },
      usuario.id,
    );
    // 2do consumo distinto recurso para no chocar con el unique index
    const [recurso2] = db
      .insert(recursos)
      .values({ nombre: 'Bee', proveedorId: proveedor.id })
      .returning()
      .all();
    consumos.create(
      {
        lineaPedidoId: linea.id,
        recursoId: recurso2.id,
        mes,
        anio,
        horasConsumidas: 25,
      },
      otroUsuario.id,
    );

    const kMio = service.kpisConsultor(usuario.id);
    expect(kMio.misHorasConsumidasMes).toBe(40);
    expect(kMio.consumosDelMes).toBe(2);

    const kSuyo = service.kpisConsultor(otroUsuario.id);
    expect(kSuyo.misHorasConsumidasMes).toBe(25);
  });

  it('POST /consumos persiste usuarioId del JwtPayload en consumosMensuales', () => {
    const { proveedor, proyecto, perfil, recurso, usuario } = setupBase();
    const pedido = pedidosService.create({
      proyectoId: proyecto.id,
      proveedorId: proveedor.id,
      lineas: [
        {
          perfilTecnicoId: perfil.id,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-08-31',
          horasOfertadas: 100,
        },
      ],
    });
    pedidosService.transitar(pedido.id, 'solicitar');
    pedidosService.transitar(pedido.id, 'aprobar');
    const linea = pedido.lineas[0];

    const dto = consumos.create(
      {
        lineaPedidoId: linea.id,
        recursoId: recurso.id,
        mes: 4,
        anio: 2026,
        horasConsumidas: 10,
      },
      usuario.id,
    );

    expect(dto.usuarioId).toBe(usuario.id);

    // confirmamos que se persistió de verdad
    const [fila] = db
      .select()
      .from(consumosMensuales)
      .where(eq(consumosMensuales.id, dto.id))
      .all();
    expect(fila.usuarioId).toBe(usuario.id);
  });
});
