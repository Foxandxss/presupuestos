import { BadRequestException, NotFoundException } from '@nestjs/common';

import { makeTestDb } from '../catalogo/testing/db';
import {
  perfilesTecnicos,
  proveedores,
  proyectos,
  recursos,
  servicios,
} from '../db/schema';
import { PedidosService } from '../pedidos/pedidos.service';
import { ResolutorTarifa } from '../pedidos/resolutor-tarifa';
import { ConsumosService } from './consumos.service';
import { ValidacionConsumoError } from './validador-consumo';

describe('ConsumosService', () => {
  let close: () => void;
  let db: ReturnType<typeof makeTestDb>['db'];
  let service: ConsumosService;
  let pedidosService: PedidosService;

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    pedidosService = new PedidosService(db, new ResolutorTarifa(db));
    service = new ConsumosService(db);
  });

  afterEach(() => {
    close();
  });

  function crearProveedor(nombre: string): number {
    const [row] = db.insert(proveedores).values({ nombre }).returning().all();
    return row.id;
  }

  function crearPerfil(nombre: string): number {
    const [row] = db
      .insert(perfilesTecnicos)
      .values({ nombre })
      .returning()
      .all();
    return row.id;
  }

  function crearRecurso(nombre: string, proveedorId: number): number {
    const [row] = db
      .insert(recursos)
      .values({ nombre, proveedorId })
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

  function crearServicio(
    proveedorId: number,
    perfilTecnicoId: number,
    tarifa: number,
  ) {
    db.insert(servicios)
      .values({ proveedorId, perfilTecnicoId, tarifaPorHora: tarifa })
      .run();
  }

  function setupPedidoAprobado(opts?: {
    horasOfertadas?: number;
    fechaInicio?: string;
    fechaFin?: string;
  }) {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('P1');
    const senior = crearPerfil('Senior');
    crearServicio(proveedorId, senior, 75);
    const recursoId = crearRecurso('Ada', proveedorId);
    const pedido = pedidosService.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: opts?.fechaInicio ?? '2026-04-01',
          fechaFin: opts?.fechaFin ?? '2026-09-30',
          horasOfertadas: opts?.horasOfertadas ?? 100,
        },
      ],
    });
    pedidosService.transitar(pedido.id, 'solicitar');
    pedidosService.transitar(pedido.id, 'aprobar');
    return {
      proveedorId,
      proyectoId,
      senior,
      recursoId,
      pedidoId: pedido.id,
      lineaId: pedido.lineas[0].id,
    };
  }

  it('registra un consumo válido y dispara Aprobado→EnEjecucion', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado();
    const consumo = service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 20,
    });
    expect(consumo.id).toBeGreaterThan(0);
    expect(consumo.lineaPedidoId).toBe(lineaId);
    expect(consumo.pedidoId).toBe(pedidoId);
    expect(pedidosService.get(pedidoId).estado).toBe('EnEjecucion');
  });

  it('al alcanzar las horas ofertadas auto-transita EnEjecucion→Consumido', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado({
      horasOfertadas: 50,
    });
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 30,
    });
    expect(pedidosService.get(pedidoId).estado).toBe('EnEjecucion');
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 6,
      anio: 2026,
      horasConsumidas: 20,
    });
    expect(pedidosService.get(pedidoId).estado).toBe('Consumido');
  });

  it('rechaza consumo con pedido en Borrador con 422 y motivo pedido_no_activo', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('P1');
    const senior = crearPerfil('Senior');
    crearServicio(proveedorId, senior, 75);
    const recursoId = crearRecurso('Ada', proveedorId);
    const pedido = pedidosService.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-09-30',
          horasOfertadas: 50,
        },
      ],
    });
    expect.assertions(3);
    try {
      service.create({
        lineaPedidoId: pedido.lineas[0].id,
        recursoId,
        mes: 5,
        anio: 2026,
        horasConsumidas: 10,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidacionConsumoError);
      expect((err as ValidacionConsumoError).motivo).toBe('pedido_no_activo');
      expect((err as ValidacionConsumoError).code).toBe('pedido_no_activo');
    }
  });

  it('rechaza recurso de otro proveedor con motivo recurso_otro_proveedor', () => {
    const { lineaId } = setupPedidoAprobado();
    const otroProveedorId = crearProveedor('Otra');
    const otroRecursoId = crearRecurso('Bob', otroProveedorId);
    expect.assertions(2);
    try {
      service.create({
        lineaPedidoId: lineaId,
        recursoId: otroRecursoId,
        mes: 5,
        anio: 2026,
        horasConsumidas: 10,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidacionConsumoError);
      expect((err as ValidacionConsumoError).motivo).toBe(
        'recurso_otro_proveedor',
      );
    }
  });

  it('rechaza consumo fuera de la ventana de la línea', () => {
    const { lineaId, recursoId } = setupPedidoAprobado({
      fechaInicio: '2026-04-01',
      fechaFin: '2026-09-30',
    });
    expect.assertions(2);
    try {
      service.create({
        lineaPedidoId: lineaId,
        recursoId,
        mes: 3,
        anio: 2026,
        horasConsumidas: 10,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidacionConsumoError);
      expect((err as ValidacionConsumoError).motivo).toBe(
        'mes_fuera_de_ventana',
      );
    }
  });

  it('rechaza si el total excede las horas ofertadas', () => {
    const { lineaId, recursoId } = setupPedidoAprobado({
      horasOfertadas: 30,
    });
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 25,
    });
    expect.assertions(3);
    try {
      service.create({
        lineaPedidoId: lineaId,
        recursoId,
        mes: 6,
        anio: 2026,
        horasConsumidas: 10,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidacionConsumoError);
      expect((err as ValidacionConsumoError).motivo).toBe(
        'excede_horas_ofertadas',
      );
      expect((err as ValidacionConsumoError).fields).toEqual({
        disponibles: 5,
      });
    }
  });

  it('rechaza duplicado de (linea, recurso, mes, año) con motivo consumo_duplicado', () => {
    const { lineaId, recursoId } = setupPedidoAprobado();
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 20,
    });
    expect.assertions(2);
    try {
      service.create({
        lineaPedidoId: lineaId,
        recursoId,
        mes: 5,
        anio: 2026,
        horasConsumidas: 5,
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidacionConsumoError);
      expect((err as ValidacionConsumoError).motivo).toBe('consumo_duplicado');
    }
  });

  it('list filtra por pedidoId, lineaPedidoId, recursoId, mes y anio', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado();
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 10,
    });
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 6,
      anio: 2026,
      horasConsumidas: 10,
    });

    expect(service.list({ pedidoId })).toHaveLength(2);
    expect(service.list({ lineaPedidoId: lineaId })).toHaveLength(2);
    expect(service.list({ recursoId })).toHaveLength(2);
    expect(service.list({ mes: 5 })).toHaveLength(1);
    expect(service.list({ anio: 2025 })).toHaveLength(0);
  });

  it('rechaza línea inexistente con BadRequest', () => {
    expect(() =>
      service.create({
        lineaPedidoId: 999,
        recursoId: 1,
        mes: 5,
        anio: 2026,
        horasConsumidas: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza recurso inexistente con BadRequest', () => {
    const { lineaId } = setupPedidoAprobado();
    expect(() =>
      service.create({
        lineaPedidoId: lineaId,
        recursoId: 999,
        mes: 5,
        anio: 2026,
        horasConsumidas: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('borrar el último consumo de EnEjecucion regresa a Aprobado', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado();
    const consumo = service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 20,
    });
    expect(pedidosService.get(pedidoId).estado).toBe('EnEjecucion');
    service.delete(consumo.id);
    expect(service.list({ pedidoId })).toHaveLength(0);
    expect(pedidosService.get(pedidoId).estado).toBe('Aprobado');
  });

  it('borrar un consumo de un pedido Consumido regresa a EnEjecucion', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado({
      horasOfertadas: 50,
    });
    const primero = service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 30,
    });
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 6,
      anio: 2026,
      horasConsumidas: 20,
    });
    expect(pedidosService.get(pedidoId).estado).toBe('Consumido');
    service.delete(primero.id);
    expect(pedidosService.get(pedidoId).estado).toBe('EnEjecucion');
  });

  it('borrar todos los consumos de un pedido Consumido regresa a Aprobado', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado({
      horasOfertadas: 50,
    });
    const a = service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 30,
    });
    const b = service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 6,
      anio: 2026,
      horasConsumidas: 20,
    });
    expect(pedidosService.get(pedidoId).estado).toBe('Consumido');
    service.delete(a.id);
    service.delete(b.id);
    expect(pedidosService.get(pedidoId).estado).toBe('Aprobado');
  });

  it('borrar consumo conserva EnEjecucion mientras queden otros consumos', () => {
    const { lineaId, recursoId, pedidoId } = setupPedidoAprobado();
    const a = service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 5,
      anio: 2026,
      horasConsumidas: 10,
    });
    service.create({
      lineaPedidoId: lineaId,
      recursoId,
      mes: 6,
      anio: 2026,
      horasConsumidas: 15,
    });
    expect(pedidosService.get(pedidoId).estado).toBe('EnEjecucion');
    service.delete(a.id);
    expect(pedidosService.get(pedidoId).estado).toBe('EnEjecucion');
  });

  it('get lanza 404 con id inexistente', () => {
    expect(() => service.get(999)).toThrow(NotFoundException);
  });
});
