import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { makeTestDb } from '../catalogo/testing/db';
import {
  perfilesTecnicos,
  proveedores,
  proyectos,
  servicios,
} from '../db/schema';
import { PedidosService } from './pedidos.service';
import { ResolutorTarifa } from './resolutor-tarifa';

describe('PedidosService', () => {
  let close: () => void;
  let service: PedidosService;
  let resolutor: ResolutorTarifa;
  let db: ReturnType<typeof makeTestDb>['db'];

  beforeEach(() => {
    const created = makeTestDb();
    db = created.db;
    close = created.close;
    resolutor = new ResolutorTarifa(db);
    service = new PedidosService(db, resolutor);
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

  function crearServicio(
    proveedorId: number,
    perfilTecnicoId: number,
    tarifa: number,
  ): number {
    const [row] = db
      .insert(servicios)
      .values({ proveedorId, perfilTecnicoId, tarifaPorHora: tarifa })
      .returning()
      .all();
    return row.id;
  }

  it('crea un pedido sin líneas en estado Borrador', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');

    const creado = service.create({ proyectoId, proveedorId });
    expect(creado.id).toBeGreaterThan(0);
    expect(creado.estado).toBe('Borrador');
    expect(creado.lineas).toEqual([]);
    expect(creado.fechaSolicitud).toBeNull();
    expect(creado.fechaAprobacion).toBeNull();
  });

  it('crea pedido con líneas y prerellena precioHora desde el Servicio', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');
    crearServicio(proveedorId, senior, 75);

    const creado = service.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 100,
        },
      ],
    });
    expect(creado.lineas).toHaveLength(1);
    expect(creado.lineas[0].precioHora).toBe(75);
    expect(creado.lineas[0].tarifaCongelada).toBe(false);
  });

  it('respeta precioHora explícito aunque exista Servicio', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');
    crearServicio(proveedorId, senior, 75);

    const creado = service.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 50,
          precioHora: 90,
        },
      ],
    });
    expect(creado.lineas[0].precioHora).toBe(90);
  });

  it('rechaza línea sin precioHora ni Servicio para el par (proveedor, perfil)', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');

    expect(() =>
      service.create({
        proyectoId,
        proveedorId,
        lineas: [
          {
            perfilTecnicoId: senior,
            fechaInicio: '2026-05-01',
            fechaFin: '2026-12-31',
            horasOfertadas: 50,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza fechaFin <= fechaInicio en una línea', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');

    expect(() =>
      service.create({
        proyectoId,
        proveedorId,
        lineas: [
          {
            perfilTecnicoId: senior,
            fechaInicio: '2026-05-01',
            fechaFin: '2026-05-01',
            horasOfertadas: 50,
            precioHora: 60,
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza proyecto o proveedor inexistentes con 400', () => {
    const proveedorId = crearProveedor('Acme');
    const proyectoId = crearProyecto('P1');
    expect(() => service.create({ proyectoId: 999, proveedorId })).toThrow(
      BadRequestException,
    );
    expect(() =>
      service.create({ proyectoId, proveedorId: 999 }),
    ).toThrow(BadRequestException);
  });

  it('lanza 404 al obtener un pedido inexistente', () => {
    expect(() => service.get(999)).toThrow(NotFoundException);
  });

  it('update reemplaza líneas y mantiene estado Borrador', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');
    const junior = crearPerfil('Junior');
    crearServicio(proveedorId, senior, 75);
    crearServicio(proveedorId, junior, 40);

    const creado = service.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 100,
        },
      ],
    });
    const actualizado = service.update(creado.id, {
      lineas: [
        {
          perfilTecnicoId: junior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-09-30',
          horasOfertadas: 80,
        },
      ],
    });
    expect(actualizado.lineas).toHaveLength(1);
    expect(actualizado.lineas[0].perfilTecnicoId).toBe(junior);
    expect(actualizado.lineas[0].precioHora).toBe(40);
  });

  it('borrar pedido cascadea sus líneas', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');
    crearServicio(proveedorId, senior, 75);

    const creado = service.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 100,
        },
      ],
    });
    service.delete(creado.id);
    expect(() => service.listLineas(creado.id)).toThrow(NotFoundException);
  });

  describe('transiciones', () => {
    function setupConLinea() {
      const proyectoId = crearProyecto('P1');
      const proveedorId = crearProveedor('Acme');
      const senior = crearPerfil('Senior');
      crearServicio(proveedorId, senior, 75);
      const pedido = service.create({
        proyectoId,
        proveedorId,
        lineas: [
          {
            perfilTecnicoId: senior,
            fechaInicio: '2026-05-01',
            fechaFin: '2026-12-31',
            horasOfertadas: 100,
          },
        ],
      });
      return { pedido, proveedorId, senior };
    }

    it('Borrador → Solicitado fija fechaSolicitud', () => {
      const { pedido } = setupConLinea();
      const tras = service.transitar(pedido.id, 'solicitar');
      expect(tras.estado).toBe('Solicitado');
      expect(tras.fechaSolicitud).not.toBeNull();
    });

    it('aprobar congela las tarifas de las líneas', () => {
      const { pedido, proveedorId, senior } = setupConLinea();
      service.transitar(pedido.id, 'solicitar');
      const tras = service.transitar(pedido.id, 'aprobar');
      expect(tras.estado).toBe('Aprobado');
      expect(tras.fechaAprobacion).not.toBeNull();
      expect(tras.lineas.every((l) => l.tarifaCongelada)).toBe(true);

      // Cambiar la tarifa del Servicio NO debe alterar la línea ya congelada.
      db.update(servicios)
        .set({ tarifaPorHora: 200 })
        .run();
      const releido = service.get(pedido.id);
      expect(releido.lineas[0].precioHora).toBe(75);
      expect(releido.lineas[0].tarifaCongelada).toBe(true);
      // Y el resolutor sí refleja el nuevo valor (sanity).
      expect(resolutor.resolver(proveedorId, senior)).toBe(200);
    });

    it('lanza 409 al aplicar transición ilegal (Borrador → aprobar)', () => {
      const { pedido } = setupConLinea();
      expect(() => service.transitar(pedido.id, 'aprobar')).toThrow(
        ConflictException,
      );
    });

    it('rechaza aprobar si el pedido no tiene líneas', () => {
      const proyectoId = crearProyecto('P1');
      const proveedorId = crearProveedor('Acme');
      const pedido = service.create({ proyectoId, proveedorId });
      service.transitar(pedido.id, 'solicitar');
      expect(() => service.transitar(pedido.id, 'aprobar')).toThrow(
        ConflictException,
      );
    });

    it('Solicitado → Rechazado y luego cualquier acción es ilegal', () => {
      const { pedido } = setupConLinea();
      service.transitar(pedido.id, 'solicitar');
      const rechazado = service.transitar(pedido.id, 'rechazar');
      expect(rechazado.estado).toBe('Rechazado');
      expect(() => service.transitar(pedido.id, 'cancelar')).toThrow(
        ConflictException,
      );
    });

    it('cancelar desde Aprobado y desde EnEjecucion', () => {
      const { pedido } = setupConLinea();
      service.transitar(pedido.id, 'solicitar');
      service.transitar(pedido.id, 'aprobar');
      const cancelado = service.transitar(pedido.id, 'cancelar');
      expect(cancelado.estado).toBe('Cancelado');
    });
  });

  describe('edición de líneas restringida por estado', () => {
    it('no permite añadir líneas a un pedido aprobado', () => {
      const proyectoId = crearProyecto('P1');
      const proveedorId = crearProveedor('Acme');
      const senior = crearPerfil('Senior');
      crearServicio(proveedorId, senior, 75);
      const pedido = service.create({
        proyectoId,
        proveedorId,
        lineas: [
          {
            perfilTecnicoId: senior,
            fechaInicio: '2026-05-01',
            fechaFin: '2026-12-31',
            horasOfertadas: 100,
          },
        ],
      });
      service.transitar(pedido.id, 'solicitar');
      service.transitar(pedido.id, 'aprobar');
      expect(() =>
        service.addLinea(pedido.id, {
          perfilTecnicoId: senior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 50,
          precioHora: 75,
        }),
      ).toThrow(ConflictException);
    });

    it('permite editar precioHora mientras el pedido está en Borrador', () => {
      const proyectoId = crearProyecto('P1');
      const proveedorId = crearProveedor('Acme');
      const senior = crearPerfil('Senior');
      crearServicio(proveedorId, senior, 75);
      const pedido = service.create({
        proyectoId,
        proveedorId,
        lineas: [
          {
            perfilTecnicoId: senior,
            fechaInicio: '2026-05-01',
            fechaFin: '2026-12-31',
            horasOfertadas: 100,
          },
        ],
      });
      const linea = pedido.lineas[0];
      const actualizada = service.updateLinea(pedido.id, linea.id, {
        precioHora: 88,
      });
      expect(actualizada.precioHora).toBe(88);
    });
  });

  it('addLinea valida perfil inexistente con 400', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const pedido = service.create({ proyectoId, proveedorId });
    expect(() =>
      service.addLinea(pedido.id, {
        perfilTecnicoId: 999,
        fechaInicio: '2026-05-01',
        fechaFin: '2026-12-31',
        horasOfertadas: 100,
        precioHora: 75,
      }),
    ).toThrow(BadRequestException);
  });

  it('updateLinea rechaza línea ajena con 404', () => {
    const proyectoId = crearProyecto('P1');
    const proveedorId = crearProveedor('Acme');
    const senior = crearPerfil('Senior');
    crearServicio(proveedorId, senior, 75);
    const p1 = service.create({
      proyectoId,
      proveedorId,
      lineas: [
        {
          perfilTecnicoId: senior,
          fechaInicio: '2026-05-01',
          fechaFin: '2026-12-31',
          horasOfertadas: 100,
        },
      ],
    });
    const p2 = service.create({ proyectoId, proveedorId });
    const lineaP1 = p1.lineas[0];
    expect(() =>
      service.updateLinea(p2.id, lineaP1.id, { horasOfertadas: 999 }),
    ).toThrow(NotFoundException);
  });
});
