import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { makeTestDb } from '../catalogo/testing/db';
import { perfilesTecnicos } from '../db/schema';
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
});
