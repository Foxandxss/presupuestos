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
  perfilesTecnicos,
  servicios,
  type PerfilTecnico,
} from '../../db/schema';
import {
  ActualizarPerfilTecnicoDto,
  CrearPerfilTecnicoDto,
} from './dto/perfil-tecnico.dto';

const UNIQUE_VIOLATION = /UNIQUE constraint failed/i;

@Injectable()
export class PerfilesTecnicosService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(): PerfilTecnico[] {
    return this.db.select().from(perfilesTecnicos).all();
  }

  get(id: number): PerfilTecnico {
    const [row] = this.db
      .select()
      .from(perfilesTecnicos)
      .where(eq(perfilesTecnicos.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Perfil técnico ${id} no encontrado`);
    }
    return row;
  }

  create(dto: CrearPerfilTecnicoDto): PerfilTecnico {
    try {
      const [row] = this.db
        .insert(perfilesTecnicos)
        .values({ nombre: dto.nombre.trim() })
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          `Ya existe un perfil técnico con nombre "${dto.nombre}"`,
        );
      }
      throw err;
    }
  }

  update(id: number, dto: ActualizarPerfilTecnicoDto): PerfilTecnico {
    this.get(id);
    if (dto.nombre === undefined) {
      return this.get(id);
    }
    try {
      const [row] = this.db
        .update(perfilesTecnicos)
        .set({
          nombre: dto.nombre.trim(),
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(perfilesTecnicos.id, id))
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          `Ya existe un perfil técnico con nombre "${dto.nombre}"`,
        );
      }
      throw err;
    }
  }

  delete(id: number): void {
    this.get(id);
    const [servicio] = this.db
      .select({ id: servicios.id })
      .from(servicios)
      .where(eq(servicios.perfilTecnicoId, id))
      .limit(1)
      .all();
    if (servicio) {
      throw new ConflictException(
        'No se puede eliminar el perfil técnico: tiene servicios asociados',
      );
    }
    this.db.delete(perfilesTecnicos).where(eq(perfilesTecnicos.id, id)).run();
  }
}
