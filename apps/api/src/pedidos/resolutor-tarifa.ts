// Deep module: dado (proveedor, perfil) devuelve la TarifaPorHora vigente del
// Servicio en el catálogo, o null si no hay servicio definido (la UI lo usa
// para prerrellenar `precioHora` de las líneas, y el backend lo usa para
// rellenarlo cuando el cliente no lo especifica).

import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import { servicios } from '../db/schema';

@Injectable()
export class ResolutorTarifa {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  resolver(proveedorId: number, perfilTecnicoId: number): number | null {
    const [row] = this.db
      .select({ tarifa: servicios.tarifaPorHora })
      .from(servicios)
      .where(
        and(
          eq(servicios.proveedorId, proveedorId),
          eq(servicios.perfilTecnicoId, perfilTecnicoId),
        ),
      )
      .limit(1)
      .all();
    return row?.tarifa ?? null;
  }
}
