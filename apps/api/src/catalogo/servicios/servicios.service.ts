import {
  BadRequestException,
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
  proveedores,
  servicios,
  type Servicio,
} from '../../db/schema';
import {
  ActualizarServicioDto,
  CrearServicioDto,
} from './dto/servicio.dto';

const UNIQUE_VIOLATION = /UNIQUE constraint failed/i;

@Injectable()
export class ServiciosService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(): Servicio[] {
    return this.db.select().from(servicios).all();
  }

  get(id: number): Servicio {
    const [row] = this.db
      .select()
      .from(servicios)
      .where(eq(servicios.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Servicio ${id} no encontrado`);
    }
    return row;
  }

  create(dto: CrearServicioDto): Servicio {
    this.assertProveedor(dto.proveedorId);
    this.assertPerfil(dto.perfilTecnicoId);
    try {
      const [row] = this.db
        .insert(servicios)
        .values({
          proveedorId: dto.proveedorId,
          perfilTecnicoId: dto.perfilTecnicoId,
          tarifaPorHora: dto.tarifaPorHora,
        })
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          'Ya existe un servicio para este proveedor y perfil técnico',
        );
      }
      throw err;
    }
  }

  update(id: number, dto: ActualizarServicioDto): Servicio {
    this.get(id);
    if (dto.proveedorId !== undefined) {
      this.assertProveedor(dto.proveedorId);
    }
    if (dto.perfilTecnicoId !== undefined) {
      this.assertPerfil(dto.perfilTecnicoId);
    }
    const updates: Partial<Servicio> = {};
    if (dto.proveedorId !== undefined) {
      updates.proveedorId = dto.proveedorId;
    }
    if (dto.perfilTecnicoId !== undefined) {
      updates.perfilTecnicoId = dto.perfilTecnicoId;
    }
    if (dto.tarifaPorHora !== undefined) {
      updates.tarifaPorHora = dto.tarifaPorHora;
    }
    if (Object.keys(updates).length === 0) {
      return this.get(id);
    }
    try {
      const [row] = this.db
        .update(servicios)
        .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
        .where(eq(servicios.id, id))
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          'Ya existe un servicio para este proveedor y perfil técnico',
        );
      }
      throw err;
    }
  }

  delete(id: number): void {
    this.get(id);
    this.db.delete(servicios).where(eq(servicios.id, id)).run();
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

  private assertPerfil(perfilTecnicoId: number): void {
    const [row] = this.db
      .select({ id: perfilesTecnicos.id })
      .from(perfilesTecnicos)
      .where(eq(perfilesTecnicos.id, perfilTecnicoId))
      .limit(1)
      .all();
    if (!row) {
      throw new BadRequestException(
        `Perfil técnico ${perfilTecnicoId} no existe`,
      );
    }
  }
}
