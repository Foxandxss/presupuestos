import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { Database } from '../../db/db.module';
import { DATABASE } from '../../db/db.module';
import { proveedores, recursos, type Recurso } from '../../db/schema';
import {
  ActualizarRecursoDto,
  CrearRecursoDto,
} from './dto/recurso.dto';

@Injectable()
export class RecursosService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(): Recurso[] {
    return this.db.select().from(recursos).all();
  }

  get(id: number): Recurso {
    const [row] = this.db
      .select()
      .from(recursos)
      .where(eq(recursos.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Recurso ${id} no encontrado`);
    }
    return row;
  }

  create(dto: CrearRecursoDto): Recurso {
    this.assertProveedorExists(dto.proveedorId);
    const [row] = this.db
      .insert(recursos)
      .values({
        nombre: dto.nombre.trim(),
        proveedorId: dto.proveedorId,
      })
      .returning()
      .all();
    return row;
  }

  update(id: number, dto: ActualizarRecursoDto): Recurso {
    this.get(id);
    if (dto.proveedorId !== undefined) {
      this.assertProveedorExists(dto.proveedorId);
    }
    const updates: Partial<Recurso> = {};
    if (dto.nombre !== undefined) {
      updates.nombre = dto.nombre.trim();
    }
    if (dto.proveedorId !== undefined) {
      updates.proveedorId = dto.proveedorId;
    }
    if (Object.keys(updates).length === 0) {
      return this.get(id);
    }
    const [row] = this.db
      .update(recursos)
      .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(recursos.id, id))
      .returning()
      .all();
    return row;
  }

  delete(id: number): void {
    this.get(id);
    this.db.delete(recursos).where(eq(recursos.id, id)).run();
  }

  private assertProveedorExists(proveedorId: number): void {
    const [row] = this.db
      .select({ id: proveedores.id })
      .from(proveedores)
      .where(eq(proveedores.id, proveedorId))
      .limit(1)
      .all();
    if (!row) {
      throw new BadRequestException(
        `Proveedor ${proveedorId} no existe`,
      );
    }
  }
}
