import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import {
  historialPedido,
  type AccionHistorialPedido,
  type EstadoPedido,
  type HistorialPedido,
} from '../db/schema';

export interface RegistroHistorial {
  pedidoId: number;
  estadoAnterior: EstadoPedido;
  estadoNuevo: EstadoPedido;
  accion: AccionHistorialPedido;
  usuarioId?: number | null;
  reconstruido?: boolean;
  fecha?: string;
}

@Injectable()
export class HistorialPedidoService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  registrar(reg: RegistroHistorial): void {
    if (reg.estadoAnterior === reg.estadoNuevo) {
      return;
    }
    this.db
      .insert(historialPedido)
      .values({
        pedidoId: reg.pedidoId,
        estadoAnterior: reg.estadoAnterior,
        estadoNuevo: reg.estadoNuevo,
        accion: reg.accion,
        usuarioId: reg.usuarioId ?? null,
        reconstruido: reg.reconstruido ?? false,
        ...(reg.fecha !== undefined ? { fecha: reg.fecha } : {}),
      })
      .run();
  }

  listar(pedidoId: number): HistorialPedido[] {
    return this.db
      .select()
      .from(historialPedido)
      .where(eq(historialPedido.pedidoId, pedidoId))
      .orderBy(asc(historialPedido.fecha), asc(historialPedido.id))
      .all();
  }
}
