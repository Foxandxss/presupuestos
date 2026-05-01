import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { DomainError } from '@operaciones/dominio';

import { makeTestDb } from '../catalogo/testing/db';
import {
  consumosMensuales,
  lineasPedido,
  pedidos,
  perfilesTecnicos,
  proveedores,
  recursos,
} from '../db/schema';
import { ProyectosService } from './proyectos.service';

describe('ProyectosService', () => {
  let close: () => void;
  let service: ProyectosService;
  let db: ReturnType<typeof makeTestDb>['db'];

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    service = new ProyectosService(db);
  });

  afterEach(() => {
    close();
  });

  function crearPerfil(nombre: string): number {
    const [row] = db
      .insert(perfilesTecnicos)
      .values({ nombre })
      .returning()
      .all();
    return row.id;
  }

  it('crea, lista, obtiene, actualiza y elimina un proyecto sin estimaciones', () => {
    const creado = service.create({
      nombre: 'Migración core',
      fechaInicio: '2026-04-01',
    });
    expect(creado.id).toBeGreaterThan(0);
    expect(creado.estimaciones).toEqual([]);

    expect(service.list()).toHaveLength(1);
    expect(service.get(creado.id).nombre).toBe('Migración core');

    const actualizado = service.update(creado.id, {
      nombre: 'Migración core 2026',
      fechaFin: '2026-12-31',
    });
    expect(actualizado.nombre).toBe('Migración core 2026');
    expect(actualizado.fechaFin).toBe('2026-12-31');

    service.delete(creado.id);
    expect(service.list()).toHaveLength(0);
  });

  it('crea proyecto con estimaciones anidadas', () => {
    const senior = crearPerfil('Senior');
    const junior = crearPerfil('Junior');
    const creado = service.create({
      nombre: 'P1',
      fechaInicio: '2026-04-01',
      estimaciones: [
        { perfilTecnicoId: senior, horasEstimadas: 200 },
        { perfilTecnicoId: junior, horasEstimadas: 80 },
      ],
    });
    expect(creado.estimaciones).toHaveLength(2);
    expect(
      creado.estimaciones.find((e) => e.perfilTecnicoId === senior)
        ?.horasEstimadas,
    ).toBe(200);
  });

  it('rechaza estimaciones con perfil técnico inexistente (400)', () => {
    expect(() =>
      service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
        estimaciones: [{ perfilTecnicoId: 999, horasEstimadas: 100 }],
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza fechaFin <= fechaInicio (400)', () => {
    expect(() =>
      service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
        fechaFin: '2026-04-01',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.create({
        nombre: 'P2',
        fechaInicio: '2026-04-01',
        fechaFin: '2026-03-01',
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza nombres duplicados con 409', () => {
    service.create({ nombre: 'P1', fechaInicio: '2026-04-01' });
    expect(() =>
      service.create({ nombre: 'P1', fechaInicio: '2026-04-02' }),
    ).toThrow(ConflictException);
  });

  it('lanza 404 al obtener un proyecto inexistente', () => {
    expect(() => service.get(999)).toThrow(NotFoundException);
  });

  it('reemplaza estimaciones cuando update incluye el campo', () => {
    const senior = crearPerfil('Senior');
    const junior = crearPerfil('Junior');
    const creado = service.create({
      nombre: 'P1',
      fechaInicio: '2026-04-01',
      estimaciones: [{ perfilTecnicoId: senior, horasEstimadas: 200 }],
    });

    const actualizado = service.update(creado.id, {
      estimaciones: [{ perfilTecnicoId: junior, horasEstimadas: 50 }],
    });
    expect(actualizado.estimaciones).toHaveLength(1);
    expect(actualizado.estimaciones[0].perfilTecnicoId).toBe(junior);
    expect(actualizado.estimaciones[0].horasEstimadas).toBe(50);
  });

  it('borrar proyecto cascadea sus estimaciones', () => {
    const perfil = crearPerfil('Senior');
    const creado = service.create({
      nombre: 'P1',
      fechaInicio: '2026-04-01',
      estimaciones: [{ perfilTecnicoId: perfil, horasEstimadas: 100 }],
    });
    service.delete(creado.id);
    expect(() => service.listEstimaciones(creado.id)).toThrow(
      NotFoundException,
    );
  });

  it('addEstimacion rechaza duplicado por (proyecto, perfil) con 409', () => {
    const perfil = crearPerfil('Senior');
    const creado = service.create({
      nombre: 'P1',
      fechaInicio: '2026-04-01',
    });
    service.addEstimacion(creado.id, {
      perfilTecnicoId: perfil,
      horasEstimadas: 100,
    });
    expect(() =>
      service.addEstimacion(creado.id, {
        perfilTecnicoId: perfil,
        horasEstimadas: 50,
      }),
    ).toThrow(ConflictException);
  });

  it('addEstimacion rechaza perfil inexistente con 400', () => {
    const creado = service.create({
      nombre: 'P1',
      fechaInicio: '2026-04-01',
    });
    expect(() =>
      service.addEstimacion(creado.id, {
        perfilTecnicoId: 999,
        horasEstimadas: 50,
      }),
    ).toThrow(BadRequestException);
  });

  it('updateEstimacion modifica horas y rechaza estimacion ajena con 404', () => {
    const perfil = crearPerfil('Senior');
    const p1 = service.create({ nombre: 'P1', fechaInicio: '2026-04-01' });
    const p2 = service.create({ nombre: 'P2', fechaInicio: '2026-04-01' });
    const est = service.addEstimacion(p1.id, {
      perfilTecnicoId: perfil,
      horasEstimadas: 100,
    });
    const actualizada = service.updateEstimacion(p1.id, est.id, {
      horasEstimadas: 250,
    });
    expect(actualizada.horasEstimadas).toBe(250);

    expect(() =>
      service.updateEstimacion(p2.id, est.id, { horasEstimadas: 999 }),
    ).toThrow(NotFoundException);
  });

  it('deleteEstimacion elimina la estimación', () => {
    const perfil = crearPerfil('Senior');
    const creado = service.create({
      nombre: 'P1',
      fechaInicio: '2026-04-01',
    });
    const est = service.addEstimacion(creado.id, {
      perfilTecnicoId: perfil,
      horasEstimadas: 100,
    });
    service.deleteEstimacion(creado.id, est.id);
    expect(service.listEstimaciones(creado.id)).toHaveLength(0);
  });

  describe('delete con guard proyecto_con_pedidos', () => {
    function crearPedido(proyectoId: number, proveedorId: number): number {
      const [row] = db
        .insert(pedidos)
        .values({ proyectoId, proveedorId, estado: 'Borrador' })
        .returning()
        .all();
      return row.id;
    }

    function crearProveedor(nombre: string): number {
      const [row] = db
        .insert(proveedores)
        .values({ nombre })
        .returning()
        .all();
      return row.id;
    }

    it('borra el proyecto sin pedidos asociados', () => {
      const creado = service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
      });
      service.delete(creado.id);
      expect(service.list()).toHaveLength(0);
    });

    it('rechaza el delete con DomainError(proyecto_con_pedidos) cuando hay pedidos', () => {
      const creado = service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
      });
      const proveedorId = crearProveedor('Acme');
      crearPedido(creado.id, proveedorId);
      crearPedido(creado.id, proveedorId);

      try {
        service.delete(creado.id);
        fail('Esperaba DomainError');
      } catch (err) {
        expect(err).toBeInstanceOf(DomainError);
        const dom = err as DomainError;
        expect(dom.code).toBe('proyecto_con_pedidos');
        expect(dom.fields).toEqual({ pedidosCount: 2 });
        expect(dom.message).toContain('2 pedidos');
      }
      // El proyecto sigue existiendo
      expect(service.get(creado.id).id).toBe(creado.id);
    });
  });

  describe('listEstimacionesConDerivados (AmpliadorEstimaciones)', () => {
    function crearProveedor(nombre: string): number {
      const [row] = db
        .insert(proveedores)
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

    function crearPedido(proyectoId: number, proveedorId: number): number {
      const [row] = db
        .insert(pedidos)
        .values({ proyectoId, proveedorId, estado: 'Aprobado' })
        .returning()
        .all();
      return row.id;
    }

    function crearLinea(
      pedidoId: number,
      perfilTecnicoId: number,
      horasOfertadas: number,
      precioHora = 50,
    ): number {
      const [row] = db
        .insert(lineasPedido)
        .values({
          pedidoId,
          perfilTecnicoId,
          fechaInicio: '2026-04-01',
          fechaFin: '2026-12-31',
          horasOfertadas,
          precioHora,
          tarifaCongelada: false,
        })
        .returning()
        .all();
      return row.id;
    }

    function crearConsumo(
      lineaPedidoId: number,
      recursoId: number,
      horasConsumidas: number,
      mes = 5,
      anio = 2026,
    ): void {
      db.insert(consumosMensuales)
        .values({
          lineaPedidoId,
          recursoId,
          mes,
          anio,
          horasConsumidas,
        })
        .run();
    }

    it('devuelve horasOfertadas y horasConsumidas agregadas por perfil', () => {
      // Fixture: proyecto con 2 estimaciones (Senior 200, Junior 80),
      // 1 pedido aprobado con 2 líneas (1 Senior 100h, 1 Junior 80h),
      // 3 consumos (Senior: 30+10=40h en linea1, Junior: 20h en linea2).
      const senior = crearPerfil('Senior');
      const junior = crearPerfil('Junior');
      const proveedorId = crearProveedor('Acme');
      const recursoId = crearRecurso('Ana', proveedorId);

      const proyecto = service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
        estimaciones: [
          { perfilTecnicoId: senior, horasEstimadas: 200 },
          { perfilTecnicoId: junior, horasEstimadas: 80 },
        ],
      });
      const pedidoId = crearPedido(proyecto.id, proveedorId);
      const linea1 = crearLinea(pedidoId, senior, 100);
      const linea2 = crearLinea(pedidoId, junior, 80);
      crearConsumo(linea1, recursoId, 30, 5);
      crearConsumo(linea1, recursoId, 10, 6);
      crearConsumo(linea2, recursoId, 20, 5);

      const filas = service.listEstimacionesConDerivados(proyecto.id);
      expect(filas).toHaveLength(2);

      const fSenior = filas.find((e) => e.perfilTecnicoId === senior);
      const fJunior = filas.find((e) => e.perfilTecnicoId === junior);
      expect(fSenior).toMatchObject({
        horasEstimadas: 200,
        horasOfertadas: 100,
        horasConsumidas: 40,
      });
      expect(fJunior).toMatchObject({
        horasEstimadas: 80,
        horasOfertadas: 80,
        horasConsumidas: 20,
      });
    });

    it('proyecto sin pedidos: ofertadas y consumidas = 0 para cada estimación', () => {
      const perfil = crearPerfil('Senior');
      const proyecto = service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
        estimaciones: [{ perfilTecnicoId: perfil, horasEstimadas: 100 }],
      });
      const filas = service.listEstimacionesConDerivados(proyecto.id);
      expect(filas).toEqual([
        expect.objectContaining({
          perfilTecnicoId: perfil,
          horasEstimadas: 100,
          horasOfertadas: 0,
          horasConsumidas: 0,
        }),
      ]);
    });

    it('lanza 404 cuando el proyecto no existe', () => {
      expect(() => service.listEstimacionesConDerivados(999)).toThrow(
        NotFoundException,
      );
    });

    it('agrega correctamente cuando hay líneas de varios pedidos al mismo perfil', () => {
      const senior = crearPerfil('Senior');
      const proveedorId = crearProveedor('Acme');
      const recursoId = crearRecurso('Ana', proveedorId);
      const proyecto = service.create({
        nombre: 'P1',
        fechaInicio: '2026-04-01',
        estimaciones: [{ perfilTecnicoId: senior, horasEstimadas: 300 }],
      });
      const ped1 = crearPedido(proyecto.id, proveedorId);
      const ped2 = crearPedido(proyecto.id, proveedorId);
      const linea1 = crearLinea(ped1, senior, 100);
      const linea2 = crearLinea(ped2, senior, 80);
      crearConsumo(linea1, recursoId, 25);
      crearConsumo(linea2, recursoId, 15);

      const filas = service.listEstimacionesConDerivados(proyecto.id);
      expect(filas[0]).toMatchObject({
        horasOfertadas: 180,
        horasConsumidas: 40,
      });
    });
  });
});
