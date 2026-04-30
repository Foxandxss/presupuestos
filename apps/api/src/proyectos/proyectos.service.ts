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
  estimacionesPerfil,
  perfilesTecnicos,
  proyectos,
  type EstimacionPerfil,
  type Proyecto,
} from '../db/schema';
import {
  ActualizarEstimacionDto,
  CrearEstimacionDto,
} from './dto/estimacion.dto';
import {
  ActualizarProyectoDto,
  CrearProyectoDto,
  ProyectoDto,
} from './dto/proyecto.dto';

const UNIQUE_VIOLATION = /UNIQUE constraint failed/i;

type ProyectoRow = Proyecto & {
  estimaciones?: EstimacionPerfil[];
};

@Injectable()
export class ProyectosService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(): ProyectoDto[] {
    const filas = this.db.select().from(proyectos).all();
    if (filas.length === 0) {
      return [];
    }
    const ids = filas.map((p) => p.id);
    const todasEstimaciones = this.db
      .select()
      .from(estimacionesPerfil)
      .where(inArray(estimacionesPerfil.proyectoId, ids))
      .all();
    const porProyecto = new Map<number, EstimacionPerfil[]>();
    for (const e of todasEstimaciones) {
      const lista = porProyecto.get(e.proyectoId) ?? [];
      lista.push(e);
      porProyecto.set(e.proyectoId, lista);
    }
    return filas.map((p) => this.adaptar(p, porProyecto.get(p.id) ?? []));
  }

  get(id: number): ProyectoDto {
    const proyecto = this.requireProyecto(id);
    const estimaciones = this.estimacionesDe(id);
    return this.adaptar(proyecto, estimaciones);
  }

  create(dto: CrearProyectoDto): ProyectoDto {
    this.validarFechas(dto.fechaInicio, dto.fechaFin);
    if (dto.estimaciones?.length) {
      this.assertPerfilesExisten(
        dto.estimaciones.map((e) => e.perfilTecnicoId),
      );
    }
    let creadoId = 0;
    try {
      const [row] = this.db
        .insert(proyectos)
        .values({
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() ?? null,
          fechaInicio: dto.fechaInicio,
          fechaFin: dto.fechaFin ?? null,
        })
        .returning()
        .all();
      creadoId = row.id;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          `Ya existe un proyecto con nombre "${dto.nombre}"`,
        );
      }
      throw err;
    }
    if (dto.estimaciones?.length) {
      try {
        this.db
          .insert(estimacionesPerfil)
          .values(
            dto.estimaciones.map((e) => ({
              proyectoId: creadoId,
              perfilTecnicoId: e.perfilTecnicoId,
              horasEstimadas: e.horasEstimadas,
            })),
          )
          .run();
      } catch (err) {
        if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
          throw new ConflictException(
            'Las estimaciones no pueden duplicar el perfil técnico',
          );
        }
        throw err;
      }
    }
    return this.get(creadoId);
  }

  update(id: number, dto: ActualizarProyectoDto): ProyectoDto {
    const actual = this.requireProyecto(id);
    const fechaInicio = dto.fechaInicio ?? actual.fechaInicio;
    const fechaFin =
      dto.fechaFin === undefined ? actual.fechaFin : dto.fechaFin;
    this.validarFechas(fechaInicio, fechaFin);

    const updates: Partial<Proyecto> = {};
    if (dto.nombre !== undefined) {
      updates.nombre = dto.nombre.trim();
    }
    if (dto.descripcion !== undefined) {
      updates.descripcion = dto.descripcion?.trim() ?? null;
    }
    if (dto.fechaInicio !== undefined) {
      updates.fechaInicio = dto.fechaInicio;
    }
    if (dto.fechaFin !== undefined) {
      updates.fechaFin = dto.fechaFin ?? null;
    }
    if (Object.keys(updates).length > 0) {
      try {
        this.db
          .update(proyectos)
          .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
          .where(eq(proyectos.id, id))
          .run();
      } catch (err) {
        if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
          throw new ConflictException(
            `Ya existe un proyecto con nombre "${dto.nombre}"`,
          );
        }
        throw err;
      }
    }
    if (dto.estimaciones !== undefined) {
      this.reemplazarEstimaciones(id, dto.estimaciones);
    }
    return this.get(id);
  }

  delete(id: number): void {
    this.requireProyecto(id);
    this.db.delete(proyectos).where(eq(proyectos.id, id)).run();
  }

  listEstimaciones(proyectoId: number): EstimacionPerfil[] {
    this.requireProyecto(proyectoId);
    return this.estimacionesDe(proyectoId);
  }

  addEstimacion(
    proyectoId: number,
    dto: CrearEstimacionDto,
  ): EstimacionPerfil {
    this.requireProyecto(proyectoId);
    this.assertPerfilesExisten([dto.perfilTecnicoId]);
    try {
      const [row] = this.db
        .insert(estimacionesPerfil)
        .values({
          proyectoId,
          perfilTecnicoId: dto.perfilTecnicoId,
          horasEstimadas: dto.horasEstimadas,
        })
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          'Ya existe una estimación para ese perfil en este proyecto',
        );
      }
      throw err;
    }
  }

  updateEstimacion(
    proyectoId: number,
    estimacionId: number,
    dto: ActualizarEstimacionDto,
  ): EstimacionPerfil {
    const actual = this.requireEstimacion(proyectoId, estimacionId);
    if (dto.perfilTecnicoId !== undefined) {
      this.assertPerfilesExisten([dto.perfilTecnicoId]);
    }
    const updates: Partial<EstimacionPerfil> = {};
    if (dto.perfilTecnicoId !== undefined) {
      updates.perfilTecnicoId = dto.perfilTecnicoId;
    }
    if (dto.horasEstimadas !== undefined) {
      updates.horasEstimadas = dto.horasEstimadas;
    }
    if (Object.keys(updates).length === 0) {
      return actual;
    }
    try {
      const [row] = this.db
        .update(estimacionesPerfil)
        .set({ ...updates, updatedAt: sql`(CURRENT_TIMESTAMP)` })
        .where(eq(estimacionesPerfil.id, estimacionId))
        .returning()
        .all();
      return row;
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          'Ya existe una estimación para ese perfil en este proyecto',
        );
      }
      throw err;
    }
  }

  deleteEstimacion(proyectoId: number, estimacionId: number): void {
    this.requireEstimacion(proyectoId, estimacionId);
    this.db
      .delete(estimacionesPerfil)
      .where(eq(estimacionesPerfil.id, estimacionId))
      .run();
  }

  private reemplazarEstimaciones(
    proyectoId: number,
    nuevas: CrearEstimacionDto[],
  ): void {
    if (nuevas.length > 0) {
      this.assertPerfilesExisten(nuevas.map((e) => e.perfilTecnicoId));
    }
    this.db
      .delete(estimacionesPerfil)
      .where(eq(estimacionesPerfil.proyectoId, proyectoId))
      .run();
    if (nuevas.length === 0) {
      return;
    }
    try {
      this.db
        .insert(estimacionesPerfil)
        .values(
          nuevas.map((e) => ({
            proyectoId,
            perfilTecnicoId: e.perfilTecnicoId,
            horasEstimadas: e.horasEstimadas,
          })),
        )
        .run();
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          'Las estimaciones no pueden duplicar el perfil técnico',
        );
      }
      throw err;
    }
  }

  private estimacionesDe(proyectoId: number): EstimacionPerfil[] {
    return this.db
      .select()
      .from(estimacionesPerfil)
      .where(eq(estimacionesPerfil.proyectoId, proyectoId))
      .all();
  }

  private requireProyecto(id: number): Proyecto {
    const [row] = this.db
      .select()
      .from(proyectos)
      .where(eq(proyectos.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Proyecto ${id} no encontrado`);
    }
    return row;
  }

  private requireEstimacion(
    proyectoId: number,
    estimacionId: number,
  ): EstimacionPerfil {
    this.requireProyecto(proyectoId);
    const [row] = this.db
      .select()
      .from(estimacionesPerfil)
      .where(eq(estimacionesPerfil.id, estimacionId))
      .limit(1)
      .all();
    if (!row || row.proyectoId !== proyectoId) {
      throw new NotFoundException(
        `Estimación ${estimacionId} no encontrada en el proyecto ${proyectoId}`,
      );
    }
    return row;
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

  private validarFechas(inicio: string, fin: string | null | undefined): void {
    if (!fin) {
      return;
    }
    if (fin <= inicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }
  }

  private adaptar(p: ProyectoRow, estimaciones: EstimacionPerfil[]): ProyectoDto {
    return {
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion ?? null,
      fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin ?? null,
      estimaciones,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
