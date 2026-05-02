import { makeTestDb } from '../catalogo/testing/db';
import { ConsumosService } from '../consumos/consumos.service';
import {
  perfilesTecnicos,
  proveedores,
  recursos,
  servicios,
} from '../db/schema';
import { HistorialPedidoService } from '../pedidos/historial-pedido.service';
import { PedidosService } from '../pedidos/pedidos.service';
import { ResolutorTarifa } from '../pedidos/resolutor-tarifa';
import { ProyectosService } from '../proyectos/proyectos.service';
import { ReportesService } from './reportes.service';

describe('ReportesService', () => {
  let close: () => void;
  let db: ReturnType<typeof makeTestDb>['db'];
  let service: ReportesService;
  let pedidosService: PedidosService;
  let proyectosService: ProyectosService;
  let consumosService: ConsumosService;

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    service = new ReportesService(db);
    const historial = new HistorialPedidoService(db);
    pedidosService = new PedidosService(db, new ResolutorTarifa(db), historial);
    proyectosService = new ProyectosService(db);
    consumosService = new ConsumosService(db, historial);
  });

  afterEach(() => {
    close();
  });

  function crearProveedor(nombre: string): number {
    return db.insert(proveedores).values({ nombre }).returning().all()[0].id;
  }

  function crearPerfil(nombre: string): number {
    return db
      .insert(perfilesTecnicos)
      .values({ nombre })
      .returning()
      .all()[0].id;
  }

  function crearRecurso(nombre: string, proveedorId: number): number {
    return db
      .insert(recursos)
      .values({ nombre, proveedorId })
      .returning()
      .all()[0].id;
  }

  function crearServicio(
    proveedorId: number,
    perfilTecnicoId: number,
    tarifa: number,
  ) {
    db.insert(servicios)
      .values({ proveedorId, perfilTecnicoId, tarifaPorHora: tarifa })
      .run();
  }

  function setupEscenario() {
    const acme = crearProveedor('Acme');
    const otra = crearProveedor('Otra');
    const senior = crearPerfil('Senior');
    const junior = crearPerfil('Junior');
    crearServicio(acme, senior, 75);
    crearServicio(acme, junior, 50);
    crearServicio(otra, senior, 80);
    const ada = crearRecurso('Ada', acme);
    const bob = crearRecurso('Bob', otra);

    const p1 = proyectosService.create({
      nombre: 'P1',
      fechaInicio: '2026-01-01',
      estimaciones: [
        { perfilTecnicoId: senior, horasEstimadas: 100 },
        { perfilTecnicoId: junior, horasEstimadas: 40 },
      ],
    });
    const p2 = proyectosService.create({
      nombre: 'P2',
      fechaInicio: '2026-01-01',
      estimaciones: [{ perfilTecnicoId: senior, horasEstimadas: 60 }],
    });

    // P1 / Acme: senior 80h, junior 40h
    const pedidoP1Acme = pedidosService.create({
      proyectoId: p1.id,
      proveedorId: acme,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-09-30',
          horasOfertadas: 80,
        },
        {
          perfilTecnicoId: junior,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-09-30',
          horasOfertadas: 40,
        },
      ],
    });
    pedidosService.transitar(pedidoP1Acme.id, 'solicitar');
    pedidosService.transitar(pedidoP1Acme.id, 'aprobar');

    // P1 / Otra: senior 30h
    const pedidoP1Otra = pedidosService.create({
      proyectoId: p1.id,
      proveedorId: otra,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-09-30',
          horasOfertadas: 30,
        },
      ],
    });
    pedidosService.transitar(pedidoP1Otra.id, 'solicitar');
    pedidosService.transitar(pedidoP1Otra.id, 'aprobar');

    // P2 / Acme: senior 50h
    const pedidoP2Acme = pedidosService.create({
      proyectoId: p2.id,
      proveedorId: acme,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 50,
        },
      ],
    });
    pedidosService.transitar(pedidoP2Acme.id, 'solicitar');
    pedidosService.transitar(pedidoP2Acme.id, 'aprobar');

    const lineaP1AcmeSenior = pedidoP1Acme.lineas.find(
      (l) => l.perfilTecnicoId === senior,
    );
    const lineaP1AcmeJunior = pedidoP1Acme.lineas.find(
      (l) => l.perfilTecnicoId === junior,
    );
    const lineaP1OtraSenior = pedidoP1Otra.lineas[0];
    if (!lineaP1AcmeSenior || !lineaP1AcmeJunior) {
      throw new Error('setup: faltan líneas esperadas');
    }

    consumosService.create({
      lineaPedidoId: lineaP1AcmeSenior.id,
      recursoId: ada,
      mes: 4,
      anio: 2026,
      horasConsumidas: 25,
    });
    consumosService.create({
      lineaPedidoId: lineaP1AcmeJunior.id,
      recursoId: ada,
      mes: 4,
      anio: 2026,
      horasConsumidas: 5,
    });
    consumosService.create({
      lineaPedidoId: lineaP1OtraSenior.id,
      recursoId: bob,
      mes: 5,
      anio: 2026,
      horasConsumidas: 10,
    });

    return {
      acme,
      otra,
      senior,
      junior,
      ada,
      bob,
      p1Id: p1.id,
      p2Id: p2.id,
      pedidoP1AcmeId: pedidoP1Acme.id,
      pedidoP1OtraId: pedidoP1Otra.id,
      pedidoP2AcmeId: pedidoP2Acme.id,
    };
  }

  describe('pedidos()', () => {
    it('lista pedidos con totales agregados (ofertadas, consumidas, importe)', () => {
      const ctx = setupEscenario();
      const filas = service.pedidos({});
      expect(filas).toHaveLength(3);

      const p1Acme = filas.find((f) => f.id === ctx.pedidoP1AcmeId);
      expect(p1Acme).toMatchObject({
        proyectoNombre: 'P1',
        proveedorNombre: 'Acme',
        estado: 'EnEjecucion',
        totalLineas: 2,
        totalHorasOfertadas: 120, // 80 + 40
        totalHorasConsumidas: 30, // 25 + 5
        importeTotal: 25 * 75 + 5 * 50, // = 2125
      });
    });

    it('filtra por estado', () => {
      const ctx = setupEscenario();
      // Crear un pedido en Borrador para asegurar que estado filtra.
      pedidosService.create({
        proyectoId: ctx.p1Id,
        proveedorId: ctx.acme,
        lineas: [
          {
            perfilTecnicoId: ctx.senior,
            fechaInicio: '2026-04-01',
            fechaFin: '2026-09-30',
            horasOfertadas: 10,
          },
        ],
      });
      const enEjecucion = service.pedidos({ estado: 'EnEjecucion' });
      expect(enEjecucion.every((f) => f.estado === 'EnEjecucion')).toBe(true);
      const borrador = service.pedidos({ estado: 'Borrador' });
      expect(borrador).toHaveLength(1);
      expect(borrador[0].estado).toBe('Borrador');
    });

    it('filtra por proveedorId', () => {
      const ctx = setupEscenario();
      const filas = service.pedidos({ proveedorId: ctx.otra });
      expect(filas).toHaveLength(1);
      expect(filas[0].proveedorId).toBe(ctx.otra);
    });

    it('filtra por proyectoId', () => {
      const ctx = setupEscenario();
      const filas = service.pedidos({ proyectoId: ctx.p2Id });
      expect(filas).toHaveLength(1);
      expect(filas[0].proyectoId).toBe(ctx.p2Id);
    });

    it('devuelve lista vacía sin pedidos', () => {
      expect(service.pedidos({})).toEqual([]);
    });
  });

  describe('horas()', () => {
    it('default desglose proyecto-perfil con nombres y agregados', () => {
      const ctx = setupEscenario();
      const filas = service.horas({});
      expect(filas).toHaveLength(3);

      const p1Senior = filas.find(
        (f) => f.proyectoId === ctx.p1Id && f.perfilTecnicoId === ctx.senior,
      );
      expect(p1Senior).toMatchObject({
        proyectoNombre: 'P1',
        perfilTecnicoNombre: 'Senior',
        proveedorId: null,
        horasEstimadas: 100,
        horasOfertadas: 110, // 80 + 30
        horasConsumidas: 35, // 25 + 10
        horasPendientes: 75,
      });
    });

    it('desglose por proveedor (estimadas en 0)', () => {
      const ctx = setupEscenario();
      const filas = service.horas({ desglose: 'proveedor' });
      expect(filas).toHaveLength(2);
      const acme = filas.find((f) => f.proveedorId === ctx.acme);
      expect(acme).toMatchObject({
        proveedorNombre: 'Acme',
        horasEstimadas: 0,
        horasOfertadas: 170, // 80 + 40 + 50
        horasConsumidas: 30, // 25 + 5
      });
    });

    it('desglose por perfil cross-proyecto', () => {
      const ctx = setupEscenario();
      const filas = service.horas({ desglose: 'perfil' });
      expect(filas).toHaveLength(2);
      const senior = filas.find((f) => f.perfilTecnicoId === ctx.senior);
      expect(senior).toMatchObject({
        perfilTecnicoNombre: 'Senior',
        horasEstimadas: 160, // 100 + 60
        horasOfertadas: 160, // 80 + 30 + 50
        horasConsumidas: 35, // 25 + 10
      });
    });

    it('filtros (proyectoId, proveedorId, perfilTecnicoId) restringen el conjunto', () => {
      const ctx = setupEscenario();
      const filas = service.horas({ proyectoId: ctx.p2Id });
      expect(filas).toHaveLength(1);
      expect(filas[0].proyectoId).toBe(ctx.p2Id);
    });

    it('excluye pedidos cancelados/rechazados de las ofertadas', () => {
      const ctx = setupEscenario();
      // Crear pedido extra y cancelarlo (vía Borrador no se puede cancelar;
      // creamos uno aprobado y luego cancelamos).
      const extra = pedidosService.create({
        proyectoId: ctx.p1Id,
        proveedorId: ctx.acme,
        lineas: [
          {
            perfilTecnicoId: ctx.senior,
            fechaInicio: '2026-04-01',
            fechaFin: '2026-09-30',
            horasOfertadas: 999,
          },
        ],
      });
      pedidosService.transitar(extra.id, 'solicitar');
      pedidosService.transitar(extra.id, 'aprobar');
      pedidosService.transitar(extra.id, 'cancelar');

      const filas = service.horas({});
      const p1Senior = filas.find(
        (f) => f.proyectoId === ctx.p1Id && f.perfilTecnicoId === ctx.senior,
      );
      // No debería sumar las 999 horas del pedido cancelado.
      expect(p1Senior?.horasOfertadas).toBe(110);
    });
  });

  describe('facturacion()', () => {
    it('agrega por (mes, año, proveedor) usando precioHora congelado', () => {
      const ctx = setupEscenario();
      const filas = service.facturacion({});
      expect(filas).toHaveLength(2);

      const abrilAcme = filas.find(
        (f) => f.mes === 4 && f.anio === 2026 && f.proveedorId === ctx.acme,
      );
      // 25h × 75€ + 5h × 50€ = 1875 + 250 = 2125
      expect(abrilAcme?.totalEur).toBe(2125);
      expect(abrilAcme?.proveedorNombre).toBe('Acme');
      expect(abrilAcme?.detalle).toHaveLength(2);

      const mayoOtra = filas.find(
        (f) => f.mes === 5 && f.anio === 2026 && f.proveedorId === ctx.otra,
      );
      // 10h × 80€ = 800
      expect(mayoOtra?.totalEur).toBe(800);
    });

    it('precioHora congelado: cambiar el Servicio NO altera la facturación', () => {
      const ctx = setupEscenario();
      // Cambiar la tarifa actual de Acme/Senior en el catálogo.
      db.update(servicios)
        .set({ tarifaPorHora: 999 })
        .run();
      const filas = service.facturacion({});
      const abrilAcme = filas.find(
        (f) => f.mes === 4 && f.anio === 2026 && f.proveedorId === ctx.acme,
      );
      // Sigue siendo 2125 — la tarifa congelada en la línea (75/50) prevalece.
      expect(abrilAcme?.totalEur).toBe(2125);
    });

    it('filtra por anio', () => {
      setupEscenario();
      expect(service.facturacion({ anio: 2025 })).toEqual([]);
      expect(service.facturacion({ anio: 2026 })).toHaveLength(2);
    });

    it('filtra por rango (mesDesde, mesHasta)', () => {
      const ctx = setupEscenario();
      const filas = service.facturacion({
        mesDesde: 5,
        anioDesde: 2026,
        mesHasta: 5,
        anioHasta: 2026,
      });
      expect(filas).toHaveLength(1);
      expect(filas[0].mes).toBe(5);
      expect(filas[0].proveedorId).toBe(ctx.otra);
    });

    it('filtra por proveedorId y proyectoId', () => {
      const ctx = setupEscenario();
      expect(service.facturacion({ proveedorId: ctx.otra })).toHaveLength(1);
      expect(service.facturacion({ proyectoId: ctx.p2Id })).toEqual([]);
    });

    it('drill-down trae nombres de proyecto, perfil y recurso', () => {
      const ctx = setupEscenario();
      const filas = service.facturacion({});
      const abrilAcme = filas.find(
        (f) => f.mes === 4 && f.anio === 2026 && f.proveedorId === ctx.acme,
      );
      const senior = abrilAcme?.detalle.find(
        (d) => d.perfilTecnicoId === ctx.senior,
      );
      expect(senior).toMatchObject({
        proyectoNombre: 'P1',
        perfilTecnicoNombre: 'Senior',
        recursoNombre: 'Ada',
        horasConsumidas: 25,
        precioHora: 75,
        importe: 1875,
      });
    });
  });
});
