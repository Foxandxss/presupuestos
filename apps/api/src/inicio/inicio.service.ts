import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import {
  consumosMensuales,
  lineasPedido,
  pedidos,
  proveedores,
  proyectos,
  recursos,
} from '../db/schema';
import {
  AgregadorActividad,
  type EventoActividad,
} from './agregador-actividad';
import {
  CalculadorKpisInicio,
  type KpisAdmin,
  type KpisConsultor,
} from './calculador-kpis-inicio';

@Injectable()
export class InicioService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  kpisAdmin(): KpisAdmin {
    const ctx = this.contextoMes();
    return CalculadorKpisInicio.admin(
      this.cargarPedidos(),
      this.cargarLineas(),
      this.cargarConsumos(),
      ctx,
    );
  }

  kpisConsultor(usuarioId: number): KpisConsultor {
    const ctx = this.contextoMes();
    return CalculadorKpisInicio.consultor(
      this.cargarPedidos(),
      this.cargarLineas(),
      this.cargarConsumos(),
      ctx,
      usuarioId,
    );
  }

  actividad(limit = 10): EventoActividad[] {
    const pedidosFila = this.db
      .select({
        id: pedidos.id,
        estado: pedidos.estado,
        createdAt: pedidos.createdAt,
        updatedAt: pedidos.updatedAt,
        fechaSolicitud: pedidos.fechaSolicitud,
        fechaAprobacion: pedidos.fechaAprobacion,
        proyectoNombre: proyectos.nombre,
        proveedorNombre: proveedores.nombre,
      })
      .from(pedidos)
      .innerJoin(proyectos, eq(proyectos.id, pedidos.proyectoId))
      .innerJoin(proveedores, eq(proveedores.id, pedidos.proveedorId))
      .all();

    const consumosFila = this.db
      .select({
        id: consumosMensuales.id,
        pedidoId: lineasPedido.pedidoId,
        proyectoNombre: proyectos.nombre,
        recursoNombre: recursos.nombre,
        mes: consumosMensuales.mes,
        anio: consumosMensuales.anio,
        horasConsumidas: consumosMensuales.horasConsumidas,
        createdAt: consumosMensuales.createdAt,
      })
      .from(consumosMensuales)
      .innerJoin(lineasPedido, eq(lineasPedido.id, consumosMensuales.lineaPedidoId))
      .innerJoin(pedidos, eq(pedidos.id, lineasPedido.pedidoId))
      .innerJoin(proyectos, eq(proyectos.id, pedidos.proyectoId))
      .innerJoin(recursos, eq(recursos.id, consumosMensuales.recursoId))
      .all();

    return AgregadorActividad.agregar(pedidosFila, consumosFila, limit);
  }

  private contextoMes() {
    const now = new Date();
    return {
      mesActual: now.getUTCMonth() + 1,
      anioActual: now.getUTCFullYear(),
    };
  }

  private cargarPedidos() {
    return this.db
      .select({ id: pedidos.id, estado: pedidos.estado })
      .from(pedidos)
      .all();
  }

  private cargarLineas() {
    return this.db
      .select({
        id: lineasPedido.id,
        pedidoId: lineasPedido.pedidoId,
        horasOfertadas: lineasPedido.horasOfertadas,
        precioHora: lineasPedido.precioHora,
        fechaFin: lineasPedido.fechaFin,
      })
      .from(lineasPedido)
      .all();
  }

  private cargarConsumos() {
    return this.db
      .select({
        lineaPedidoId: consumosMensuales.lineaPedidoId,
        usuarioId: consumosMensuales.usuarioId,
        mes: consumosMensuales.mes,
        anio: consumosMensuales.anio,
        horasConsumidas: consumosMensuales.horasConsumidas,
      })
      .from(consumosMensuales)
      .all();
  }
}
