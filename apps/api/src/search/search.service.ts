import { Inject, Injectable } from '@nestjs/common';
import { eq, like, or } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import { pedidos, proveedores, proyectos } from '../db/schema';
import {
  PedidoSearchDto,
  ProveedorSearchDto,
  ProyectoSearchDto,
  SearchResultDto,
} from './dto/search.dto';

const LIMIT_POR_CATEGORIA = 5;

@Injectable()
export class SearchService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  buscar(query: string): SearchResultDto {
    const q = query.trim();
    if (q.length === 0) {
      return { pedidos: [], proyectos: [], proveedores: [] };
    }

    return {
      pedidos: this.buscarPedidos(q),
      proyectos: this.buscarProyectos(q),
      proveedores: this.buscarProveedores(q),
    };
  }

  private buscarPedidos(q: string): PedidoSearchDto[] {
    const idExacto = this.parsearIdPedido(q);
    const patron = `%${q}%`;

    const filas = this.db
      .select({
        id: pedidos.id,
        estado: pedidos.estado,
        proyectoId: pedidos.proyectoId,
        proyectoNombre: proyectos.nombre,
        proveedorId: pedidos.proveedorId,
        proveedorNombre: proveedores.nombre,
      })
      .from(pedidos)
      .innerJoin(proyectos, eq(pedidos.proyectoId, proyectos.id))
      .innerJoin(proveedores, eq(pedidos.proveedorId, proveedores.id))
      .where(
        idExacto !== null
          ? or(
              eq(pedidos.id, idExacto),
              like(proyectos.nombre, patron),
              like(proveedores.nombre, patron),
            )
          : or(like(proyectos.nombre, patron), like(proveedores.nombre, patron)),
      )
      .limit(LIMIT_POR_CATEGORIA)
      .all();

    return filas;
  }

  private buscarProyectos(q: string): ProyectoSearchDto[] {
    const patron = `%${q}%`;
    return this.db
      .select({ id: proyectos.id, nombre: proyectos.nombre })
      .from(proyectos)
      .where(like(proyectos.nombre, patron))
      .limit(LIMIT_POR_CATEGORIA)
      .all();
  }

  private buscarProveedores(q: string): ProveedorSearchDto[] {
    const patron = `%${q}%`;
    return this.db
      .select({ id: proveedores.id, nombre: proveedores.nombre })
      .from(proveedores)
      .where(like(proveedores.nombre, patron))
      .limit(LIMIT_POR_CATEGORIA)
      .all();
  }

  private parsearIdPedido(q: string): number | null {
    const limpio = q.startsWith('#') ? q.slice(1) : q;
    if (!/^\d+$/.test(limpio)) {
      return null;
    }
    const id = Number.parseInt(limpio, 10);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
}
