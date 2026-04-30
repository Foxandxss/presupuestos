import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import type { Database } from '../../db/db.module';
import { DATABASE } from '../../db/db.module';
import {
  proveedores,
  recursos,
  servicios,
  type Proveedor,
} from '../../db/schema';
import {
  ActualizarProveedorDto,
  CrearProveedorDto,
} from './dto/proveedor.dto';

const UNIQUE_VIOLATION = /UNIQUE constraint failed/i;

@Injectable()
export class ProveedoresService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(): Proveedor[] {
    return this.db.select().from(proveedores).all();
  }

  get(id: number): Proveedor {
    const [row] = this.db
      .select()
      .from(proveedores)
      .where(eq(proveedores.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
    return row;
  }

  create(dto: CrearProveedorDto): Proveedor {
    try {
      const [row] = this.db
        .insert(proveedores)
        .values({ nombre: dto.nombre.trim() })
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          `Ya existe un proveedor con nombre "${dto.nombre}"`,
        );
      }
      throw err;
    }
  }

  update(id: number, dto: ActualizarProveedorDto): Proveedor {
    this.get(id);
    const updates: Partial<Proveedor> = {};
    if (dto.nombre !== undefined) {
      updates.nombre = dto.nombre.trim();
    }
    if (Object.keys(updates).length === 0) {
      return this.get(id);
    }
    try {
      const [row] = this.db
        .update(proveedores)
        .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
        .where(eq(proveedores.id, id))
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          `Ya existe un proveedor con nombre "${dto.nombre}"`,
        );
      }
      throw err;
    }
  }

  delete(id: number): void {
    this.get(id);

    const [recurso] = this.db
      .select({ id: recursos.id })
      .from(recursos)
      .where(eq(recursos.proveedorId, id))
      .limit(1)
      .all();
    if (recurso) {
      throw new ConflictException(
        'No se puede eliminar el proveedor: tiene recursos asociados',
      );
    }

    const [servicio] = this.db
      .select({ id: servicios.id })
      .from(servicios)
      .where(eq(servicios.proveedorId, id))
      .limit(1)
      .all();
    if (servicio) {
      throw new ConflictException(
        'No se puede eliminar el proveedor: tiene servicios asociados',
      );
    }

    this.db.delete(proveedores).where(eq(proveedores.id, id)).run();
  }
}
