import { BadRequestException, ConflictException } from '@nestjs/common';

import { perfilesTecnicos, proveedores } from '../../db/schema';
import { makeTestDb } from '../testing/db';
import { ServiciosService } from './servicios.service';

describe('ServiciosService', () => {
  let close: () => void;
  let service: ServiciosService;
  let proveedorId: number;
  let perfilId: number;

  beforeEach(() => {
    const { db, close: cleanup } = makeTestDb();
    close = cleanup;
    service = new ServiciosService(db);

    [{ id: proveedorId }] = db
      .insert(proveedores)
      .values({ nombre: 'Acme' })
      .returning()
      .all();
    [{ id: perfilId }] = db
      .insert(perfilesTecnicos)
      .values({ nombre: 'Senior' })
      .returning()
      .all();
  });

  afterEach(() => {
    close();
  });

  it('crea un servicio para (proveedor, perfil) único', () => {
    const servicio = service.create({
      proveedorId,
      perfilTecnicoId: perfilId,
      tarifaPorHora: 65,
    });
    expect(servicio.tarifaPorHora).toBe(65);
  });

  it('rechaza un segundo servicio con el mismo (proveedor, perfil) con 409', () => {
    service.create({
      proveedorId,
      perfilTecnicoId: perfilId,
      tarifaPorHora: 65,
    });
    expect(() =>
      service.create({
        proveedorId,
        perfilTecnicoId: perfilId,
        tarifaPorHora: 70,
      }),
    ).toThrow(ConflictException);
  });

  it('rechaza un servicio con proveedor inexistente con 400', () => {
    expect(() =>
      service.create({
        proveedorId: 9999,
        perfilTecnicoId: perfilId,
        tarifaPorHora: 65,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza un servicio con perfil inexistente con 400', () => {
    expect(() =>
      service.create({
        proveedorId,
        perfilTecnicoId: 9999,
        tarifaPorHora: 65,
      }),
    ).toThrow(BadRequestException);
  });
});
