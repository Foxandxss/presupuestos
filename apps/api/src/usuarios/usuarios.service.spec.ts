import { ConflictException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { makeTestDb } from '../catalogo/testing/db';
import { usuarios } from '../db/schema';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let close: () => void;
  let service: UsuariosService;
  let db: ReturnType<typeof makeTestDb>['db'];

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    service = new UsuariosService(db);
  });

  afterEach(() => {
    close();
  });

  function sembrarUsuariosBase(): void {
    db.insert(usuarios)
      .values([
        {
          email: 'admin@demo.com',
          nombre: 'Admin Demo',
          passwordHash: 'hash',
          rol: 'admin',
        },
        {
          email: 'consultor@demo.com',
          nombre: 'Consultor Demo',
          passwordHash: 'hash',
          rol: 'consultor',
        },
      ])
      .run();
  }

  it('crea un usuario hasheando la password y normalizando el email', () => {
    const creado = service.create({
      email: '  Nuevo@Empresa.COM  ',
      nombre: '  Ana García  ',
      rol: 'consultor',
      passwordInicial: 'secreta-1234',
    });

    expect(creado.id).toBeGreaterThan(0);
    expect(creado.email).toBe('nuevo@empresa.com');
    expect(creado.nombre).toBe('Ana García');
    expect(creado.suspendido).toBe(false);
    expect(creado.eliminadoEn).toBeNull();

    const persistido = db.select().from(usuarios).all();
    expect(persistido).toHaveLength(1);
    expect(persistido[0].passwordHash).not.toBe('secreta-1234');
    expect(bcrypt.compareSync('secreta-1234', persistido[0].passwordHash)).toBe(
      true,
    );
  });

  it('rechaza con 409 cuando el email ya existe', () => {
    service.create({
      email: 'dup@x.com',
      nombre: 'Dup',
      rol: 'consultor',
      passwordInicial: 'password-1234',
    });
    expect(() =>
      service.create({
        email: 'DUP@x.com',
        nombre: 'Otro',
        rol: 'admin',
        passwordInicial: 'otra-password',
      }),
    ).toThrow(ConflictException);
  });

  it('lista usuarios con paginacion (total post-filtro, items recortados)', () => {
    sembrarUsuariosBase();
    for (let i = 0; i < 10; i++) {
      service.create({
        email: `u${i}@x.com`,
        nombre: `Usuario ${i}`,
        rol: 'consultor',
        passwordInicial: 'password-1234',
      });
    }

    const pagina1 = service.list({ limit: 5, offset: 0 });
    expect(pagina1.total).toBe(12);
    expect(pagina1.items).toHaveLength(5);

    const pagina3 = service.list({ limit: 5, offset: 10 });
    expect(pagina3.total).toBe(12);
    expect(pagina3.items).toHaveLength(2);
  });

  it('filtra por rol', () => {
    sembrarUsuariosBase();
    const admins = service.list({ limit: 25, offset: 0, rol: 'admin' });
    expect(admins.total).toBe(1);
    expect(admins.items[0].rol).toBe('admin');
  });

  it('filtra por substring case-insensitive en email o nombre', () => {
    sembrarUsuariosBase();
    service.create({
      email: 'ana@x.com',
      nombre: 'Ana García',
      rol: 'consultor',
      passwordInicial: 'password-1234',
    });

    const porNombre = service.list({ limit: 25, offset: 0, q: 'ana' });
    expect(porNombre.total).toBe(1);
    expect(porNombre.items[0].email).toBe('ana@x.com');

    const porEmail = service.list({
      limit: 25,
      offset: 0,
      q: 'CONSULTOR@',
    });
    expect(porEmail.total).toBe(1);
    expect(porEmail.items[0].email).toBe('consultor@demo.com');
  });

  it('oculta soft-deleted por defecto y los muestra con incluirEliminados=true', () => {
    sembrarUsuariosBase();
    db.update(usuarios)
      .set({ eliminadoEn: '2026-04-15T10:00:00.000Z' })
      .where(eq(usuarios.email, 'consultor@demo.com'))
      .run();

    const visibles = service.list({ limit: 25, offset: 0 });
    expect(visibles.total).toBe(1);
    expect(visibles.items.map((u) => u.email)).toEqual(['admin@demo.com']);

    const todos = service.list({
      limit: 25,
      offset: 0,
      incluirEliminados: true,
    });
    expect(todos.total).toBe(2);
    // Eliminado va al final del listado.
    expect(todos.items[1].email).toBe('consultor@demo.com');
    expect(todos.items[1].eliminadoEn).toBe('2026-04-15T10:00:00.000Z');
  });
});
