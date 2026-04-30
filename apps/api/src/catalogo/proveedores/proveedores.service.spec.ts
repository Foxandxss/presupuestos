import { ConflictException, NotFoundException } from '@nestjs/common';

import { perfilesTecnicos, recursos, servicios } from '../../db/schema';
import { makeTestDb } from '../testing/db';
import { ProveedoresService } from './proveedores.service';

describe('ProveedoresService', () => {
  let close: () => void;
  let service: ProveedoresService;
  let db: ReturnType<typeof makeTestDb>['db'];

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    service = new ProveedoresService(db);
  });

  afterEach(() => {
    close();
  });

  it('crea, lista, obtiene, actualiza y elimina un proveedor', () => {
    const creado = service.create({ nombre: 'Acme' });
    expect(creado.id).toBeGreaterThan(0);
    expect(service.list()).toHaveLength(1);
    expect(service.get(creado.id).nombre).toBe('Acme');

    const actualizado = service.update(creado.id, { nombre: 'Acme Inc.' });
    expect(actualizado.nombre).toBe('Acme Inc.');

    service.delete(creado.id);
    expect(service.list()).toHaveLength(0);
  });

  it('rechaza nombres duplicados con 409', () => {
    service.create({ nombre: 'Acme' });
    expect(() => service.create({ nombre: 'Acme' })).toThrow(
      ConflictException,
    );
  });

  it('lanza 404 al obtener un proveedor inexistente', () => {
    expect(() => service.get(999)).toThrow(NotFoundException);
  });

  it('rechaza eliminar un proveedor con recursos asociados (409)', () => {
    const proveedor = service.create({ nombre: 'Acme' });
    db.insert(recursos)
      .values({ nombre: 'Ana', proveedorId: proveedor.id })
      .run();
    expect(() => service.delete(proveedor.id)).toThrow(ConflictException);
  });

  it('rechaza eliminar un proveedor con servicios asociados (409)', () => {
    const proveedor = service.create({ nombre: 'Acme' });
    const [perfil] = db
      .insert(perfilesTecnicos)
      .values({ nombre: 'Senior' })
      .returning()
      .all();
    db.insert(servicios)
      .values({
        proveedorId: proveedor.id,
        perfilTecnicoId: perfil.id,
        tarifaPorHora: 65,
      })
      .run();
    expect(() => service.delete(proveedor.id)).toThrow(ConflictException);
  });
});
