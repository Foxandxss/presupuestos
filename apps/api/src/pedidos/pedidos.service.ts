import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import {
  lineasPedido,
  pedidos,
  perfilesTecnicos,
  proveedores,
  proyectos,
  type EstadoPedido,
  type HistorialPedido,
  type LineaPedido,
  type Pedido,
} from '../db/schema';
import {
  ActualizarLineaPedidoDto,
  CrearLineaPedidoDto,
  LineaPedidoDto,
} from './dto/linea-pedido.dto';
import {
  ActualizarPedidoDto,
  CrearPedidoDto,
  PedidoDto,
} from './dto/pedido.dto';
import { HistorialPedidoService } from './historial-pedido.service';
import {
  AccionPedido,
  MaquinaEstadosPedido,
} from './maquina-estados-pedido';
import { ResolutorTarifa } from './resolutor-tarifa';

const ESTADOS_EDITABLES: ReadonlySet<EstadoPedido> = new Set([
  'Borrador',
  'Solicitado',
]);

@Injectable()
export class PedidosService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly resolutorTarifa: ResolutorTarifa,
    private readonly historial: HistorialPedidoService,
  ) {}

  list(): PedidoDto[] {
    const filas = this.db.select().from(pedidos).all();
    if (filas.length === 0) {
      return [];
    }
    const ids = filas.map((p) => p.id);
    const todasLineas = this.db
      .select()
      .from(lineasPedido)
      .where(inArray(lineasPedido.pedidoId, ids))
      .all();
    const porPedido = new Map<number, LineaPedido[]>();
    for (const l of todasLineas) {
      const lista = porPedido.get(l.pedidoId) ?? [];
      lista.push(l);
      porPedido.set(l.pedidoId, lista);
    }
    return filas.map((p) => this.adaptar(p, porPedido.get(p.id) ?? [], []));
  }

  get(id: number): PedidoDto {
    const pedido = this.requirePedido(id);
    const lineas = this.lineasDe(id);
    const historial = this.historial.listar(id);
    return this.adaptar(pedido, lineas, historial);
  }

  create(dto: CrearPedidoDto): PedidoDto {
    this.assertProyecto(dto.proyectoId);
    this.assertProveedor(dto.proveedorId);
    if (dto.lineas?.length) {
      this.assertPerfilesExisten(dto.lineas.map((l) => l.perfilTecnicoId));
      dto.lineas.forEach((l) => this.validarFechasLinea(l.fechaInicio, l.fechaFin));
    }

    const [creado] = this.db
      .insert(pedidos)
      .values({
        proyectoId: dto.proyectoId,
        proveedorId: dto.proveedorId,
        estado: 'Borrador',
      })
      .returning()
      .all();

    if (dto.lineas?.length) {
      this.insertarLineas(creado.id, dto.proveedorId, dto.lineas);
    }
    return this.get(creado.id);
  }

  update(id: number, dto: ActualizarPedidoDto): PedidoDto {
    const actual = this.requirePedido(id);
    if (!ESTADOS_EDITABLES.has(actual.estado)) {
      throw new ConflictException(
        `No se puede editar un pedido en estado '${actual.estado}'`,
      );
    }
    const proveedorId = dto.proveedorId ?? actual.proveedorId;
    if (dto.proyectoId !== undefined) {
      this.assertProyecto(dto.proyectoId);
    }
    if (dto.proveedorId !== undefined) {
      this.assertProveedor(dto.proveedorId);
    }
    if (dto.lineas !== undefined) {
      if (dto.lineas.length > 0) {
        this.assertPerfilesExisten(dto.lineas.map((l) => l.perfilTecnicoId));
        dto.lineas.forEach((l) =>
          this.validarFechasLinea(l.fechaInicio, l.fechaFin),
        );
      }
    }
    const updates: Partial<Pedido> = {};
    if (dto.proyectoId !== undefined) updates.proyectoId = dto.proyectoId;
    if (dto.proveedorId !== undefined) updates.proveedorId = dto.proveedorId;
    if (Object.keys(updates).length > 0) {
      this.db
        .update(pedidos)
        .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
        .where(eq(pedidos.id, id))
        .run();
    }
    if (dto.lineas !== undefined) {
      this.db.delete(lineasPedido).where(eq(lineasPedido.pedidoId, id)).run();
      if (dto.lineas.length > 0) {
        this.insertarLineas(id, proveedorId, dto.lineas);
      }
    }
    return this.get(id);
  }

  delete(id: number): void {
    this.requirePedido(id);
    this.db.delete(pedidos).where(eq(pedidos.id, id)).run();
  }

  transitar(id: number, accion: AccionPedido, usuarioId?: number): PedidoDto {
    const actual = this.requirePedido(id);
    const siguiente = MaquinaEstadosPedido.aplicar(actual.estado, accion);
    const updates: Partial<Pedido> = { estado: siguiente };
    const ahora = nowISODate();
    if (accion === 'solicitar') {
      updates.fechaSolicitud = ahora;
    }
    if (accion === 'aprobar') {
      updates.fechaAprobacion = ahora;
      const lineas = this.lineasDe(id);
      if (lineas.length === 0) {
        throw new ConflictException(
          'No se puede aprobar un pedido sin líneas',
        );
      }
      // Side effect: congelar las tarifas vigentes en cada línea
      this.db
        .update(lineasPedido)
        .set({
          tarifaCongelada: true,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(lineasPedido.pedidoId, id))
        .run();
    }
    this.db
      .update(pedidos)
      .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(pedidos.id, id))
      .run();
    this.historial.registrar({
      pedidoId: id,
      estadoAnterior: actual.estado,
      estadoNuevo: siguiente,
      accion,
      usuarioId,
    });
    return this.get(id);
  }

  listLineas(pedidoId: number): LineaPedidoDto[] {
    this.requirePedido(pedidoId);
    return this.lineasDe(pedidoId);
  }

  addLinea(pedidoId: number, dto: CrearLineaPedidoDto): LineaPedidoDto {
    const pedido = this.requirePedido(pedidoId);
    if (!ESTADOS_EDITABLES.has(pedido.estado)) {
      throw new ConflictException(
        `No se pueden añadir líneas a un pedido en estado '${pedido.estado}'`,
      );
    }
    this.assertPerfilesExisten([dto.perfilTecnicoId]);
    this.validarFechasLinea(dto.fechaInicio, dto.fechaFin);
    const precioHora = this.resolverPrecioHora(
      pedido.proveedorId,
      dto.perfilTecnicoId,
      dto.precioHora,
    );
    const [row] = this.db
      .insert(lineasPedido)
      .values({
        pedidoId,
        perfilTecnicoId: dto.perfilTecnicoId,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        horasOfertadas: dto.horasOfertadas,
        precioHora,
        tarifaCongelada: false,
      })
      .returning()
      .all();
    return row;
  }

  updateLinea(
    pedidoId: number,
    lineaId: number,
    dto: ActualizarLineaPedidoDto,
  ): LineaPedidoDto {
    const pedido = this.requirePedido(pedidoId);
    const linea = this.requireLinea(pedidoId, lineaId);
    if (!ESTADOS_EDITABLES.has(pedido.estado)) {
      throw new ConflictException(
        `No se pueden modificar líneas de un pedido en estado '${pedido.estado}'`,
      );
    }
    if (dto.perfilTecnicoId !== undefined) {
      this.assertPerfilesExisten([dto.perfilTecnicoId]);
    }
    const fechaInicio = dto.fechaInicio ?? linea.fechaInicio;
    const fechaFin = dto.fechaFin ?? linea.fechaFin;
    this.validarFechasLinea(fechaInicio, fechaFin);

    const updates: Partial<LineaPedido> = {};
    if (dto.perfilTecnicoId !== undefined) {
      updates.perfilTecnicoId = dto.perfilTecnicoId;
    }
    if (dto.fechaInicio !== undefined) updates.fechaInicio = dto.fechaInicio;
    if (dto.fechaFin !== undefined) updates.fechaFin = dto.fechaFin;
    if (dto.horasOfertadas !== undefined) {
      updates.horasOfertadas = dto.horasOfertadas;
    }
    if (dto.precioHora !== undefined) {
      updates.precioHora = dto.precioHora;
    }
    if (Object.keys(updates).length === 0) {
      return linea;
    }
    const [row] = this.db
      .update(lineasPedido)
      .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(lineasPedido.id, lineaId))
      .returning()
      .all();
    return row;
  }

  deleteLinea(pedidoId: number, lineaId: number): void {
    const pedido = this.requirePedido(pedidoId);
    this.requireLinea(pedidoId, lineaId);
    if (!ESTADOS_EDITABLES.has(pedido.estado)) {
      throw new ConflictException(
        `No se pueden borrar líneas de un pedido en estado '${pedido.estado}'`,
      );
    }
    this.db.delete(lineasPedido).where(eq(lineasPedido.id, lineaId)).run();
  }

  private insertarLineas(
    pedidoId: number,
    proveedorId: number,
    lineas: CrearLineaPedidoDto[],
  ): void {
    const filas = lineas.map((l) => ({
      pedidoId,
      perfilTecnicoId: l.perfilTecnicoId,
      fechaInicio: l.fechaInicio,
      fechaFin: l.fechaFin,
      horasOfertadas: l.horasOfertadas,
      precioHora: this.resolverPrecioHora(
        proveedorId,
        l.perfilTecnicoId,
        l.precioHora,
      ),
      tarifaCongelada: false,
    }));
    this.db.insert(lineasPedido).values(filas).run();
  }

  private resolverPrecioHora(
    proveedorId: number,
    perfilTecnicoId: number,
    explicito: number | undefined,
  ): number {
    if (explicito !== undefined) {
      return explicito;
    }
    const tarifa = this.resolutorTarifa.resolver(proveedorId, perfilTecnicoId);
    if (tarifa === null) {
      throw new BadRequestException(
        `No hay servicio definido para el proveedor ${proveedorId} y perfil ${perfilTecnicoId}: especifica precioHora explícitamente`,
      );
    }
    return tarifa;
  }

  private validarFechasLinea(inicio: string, fin: string): void {
    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha de fin de la línea debe ser posterior a la fecha de inicio',
      );
    }
  }

  private lineasDe(pedidoId: number): LineaPedido[] {
    return this.db
      .select()
      .from(lineasPedido)
      .where(eq(lineasPedido.pedidoId, pedidoId))
      .all();
  }

  private requirePedido(id: number): Pedido {
    const [row] = this.db
      .select()
      .from(pedidos)
      .where(eq(pedidos.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Pedido ${id} no encontrado`);
    }
    return row;
  }

  private requireLinea(pedidoId: number, lineaId: number): LineaPedido {
    const [row] = this.db
      .select()
      .from(lineasPedido)
      .where(eq(lineasPedido.id, lineaId))
      .limit(1)
      .all();
    if (!row || row.pedidoId !== pedidoId) {
      throw new NotFoundException(
        `Línea ${lineaId} no encontrada en el pedido ${pedidoId}`,
      );
    }
    return row;
  }

  private assertProyecto(proyectoId: number): void {
    const [row] = this.db
      .select({ id: proyectos.id })
      .from(proyectos)
      .where(eq(proyectos.id, proyectoId))
      .limit(1)
      .all();
    if (!row) {
      throw new BadRequestException(`Proyecto ${proyectoId} no existe`);
    }
  }

  private assertProveedor(proveedorId: number): void {
    const [row] = this.db
      .select({ id: proveedores.id })
      .from(proveedores)
      .where(eq(proveedores.id, proveedorId))
      .limit(1)
      .all();
    if (!row) {
      throw new BadRequestException(`Proveedor ${proveedorId} no existe`);
    }
  }

  private assertPerfilesExisten(ids: number[]): void {
    const unicos = Array.from(new Set(ids));
    const existentes = this.db
      .select({ id: perfilesTecnicos.id })
      .from(perfilesTecnicos)
      .where(inArray(perfilesTecnicos.id, unicos))
      .all();
    if (existentes.length !== unicos.length) {
      const setExistentes = new Set(existentes.map((r) => r.id));
      const faltante = unicos.find((id) => !setExistentes.has(id));
      throw new BadRequestException(`Perfil técnico ${faltante} no existe`);
    }
  }

  private adaptar(
    p: Pedido,
    lineas: LineaPedido[],
    historial: HistorialPedido[],
  ): PedidoDto {
    return {
      id: p.id,
      proyectoId: p.proyectoId,
      proveedorId: p.proveedorId,
      estado: p.estado,
      fechaSolicitud: p.fechaSolicitud ?? null,
      fechaAprobacion: p.fechaAprobacion ?? null,
      lineas,
      historial: historial.map((h) => ({
        id: h.id,
        estadoAnterior: h.estadoAnterior,
        estadoNuevo: h.estadoNuevo,
        accion: h.accion,
        usuarioId: h.usuarioId ?? null,
        fecha: h.fecha,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}

function nowISODate(): string {
  return new Date().toISOString().slice(0, 10);
}
