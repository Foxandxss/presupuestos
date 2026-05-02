import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { and, eq, isNull, like, or, sql } from 'drizzle-orm';

import type { Rol } from '@operaciones/dominio';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import { usuarios, type Usuario } from '../db/schema';
import {
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  UsuarioDto,
  UsuariosPaginaDto,
} from './dto/usuario.dto';

const UNIQUE_VIOLATION = /UNIQUE constraint failed/i;
const BCRYPT_ROUNDS = 10;

export interface UsuariosFiltros {
  readonly limit: number;
  readonly offset: number;
  readonly q?: string;
  readonly rol?: Rol;
  readonly incluirEliminados?: boolean;
}

@Injectable()
export class UsuariosService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(filtros: UsuariosFiltros): UsuariosPaginaDto {
    const where = this.armarFiltro(filtros);
    const todos = where
      ? this.db.select().from(usuarios).where(where).all()
      : this.db.select().from(usuarios).all();
    const ordenados = todos.sort((a, b) => {
      // Soft-deleted al final, luego por id desc (mas recientes primero).
      if ((a.eliminadoEn === null) !== (b.eliminadoEn === null)) {
        return a.eliminadoEn === null ? -1 : 1;
      }
      return b.id - a.id;
    });
    const total = ordenados.length;
    const items = ordenados
      .slice(filtros.offset, filtros.offset + filtros.limit)
      .map(adaptar);
    return { total, items };
  }

  create(dto: CrearUsuarioDto): UsuarioDto {
    const email = dto.email.trim().toLowerCase();
    const nombre = dto.nombre.trim();
    const passwordHash = bcrypt.hashSync(dto.passwordInicial, BCRYPT_ROUNDS);
    try {
      const [row] = this.db
        .insert(usuarios)
        .values({ email, nombre, rol: dto.rol, passwordHash })
        .returning()
        .all();
      return adaptar(row);
    } catch (err) {
      if (err instanceof Error && UNIQUE_VIOLATION.test(err.message)) {
        throw new ConflictException(
          `Ya existe un usuario con email "${email}"`,
        );
      }
      throw err;
    }
  }

  update(id: number, dto: ActualizarUsuarioDto): UsuarioDto {
    const usuario = this.requireUsuario(id);
    const cambios: Partial<typeof usuarios.$inferInsert> = {};
    if (dto.nombre !== undefined) cambios.nombre = dto.nombre.trim();
    if (dto.rol !== undefined) cambios.rol = dto.rol;
    if (Object.keys(cambios).length === 0) {
      // Sin cambios efectivos: devuelve el row tal cual.
      return adaptar(usuario);
    }
    cambios.updatedAt = new Date().toISOString();
    const [row] = this.db
      .update(usuarios)
      .set(cambios)
      .where(eq(usuarios.id, id))
      .returning()
      .all();
    return adaptar(row);
  }

  resetPassword(id: number, nuevaPassword: string): UsuarioDto {
    const usuario = this.requireUsuario(id);
    if (usuario.eliminadoEn !== null) {
      throw new BadRequestException(
        'No se puede resetear la contraseña de un usuario eliminado.',
      );
    }
    const passwordHash = bcrypt.hashSync(nuevaPassword, BCRYPT_ROUNDS);
    const [row] = this.db
      .update(usuarios)
      .set({ passwordHash, updatedAt: new Date().toISOString() })
      .where(eq(usuarios.id, id))
      .returning()
      .all();
    return adaptar(row);
  }

  suspender(id: number, suspendido: boolean, actorId?: number): UsuarioDto {
    const usuario = this.requireUsuario(id);
    if (usuario.eliminadoEn !== null) {
      throw new BadRequestException(
        'No se puede suspender un usuario eliminado.',
      );
    }
    if (actorId !== undefined && actorId === id && suspendido) {
      throw new BadRequestException(
        'No puedes suspender tu propia cuenta.',
      );
    }
    const [row] = this.db
      .update(usuarios)
      .set({ suspendido, updatedAt: new Date().toISOString() })
      .where(eq(usuarios.id, id))
      .returning()
      .all();
    return adaptar(row);
  }

  remove(id: number, actorId?: number): UsuarioDto {
    const usuario = this.requireUsuario(id);
    if (actorId !== undefined && actorId === id) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta.');
    }
    if (usuario.eliminadoEn !== null) {
      // Idempotente: ya estaba eliminado.
      return adaptar(usuario);
    }
    const eliminadoEn = new Date().toISOString();
    const [row] = this.db
      .update(usuarios)
      .set({ eliminadoEn, updatedAt: eliminadoEn })
      .where(eq(usuarios.id, id))
      .returning()
      .all();
    return adaptar(row);
  }

  private requireUsuario(id: number): Usuario {
    const [row] = this.db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1)
      .all();
    if (!row) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }
    return row;
  }

  private armarFiltro(filtros: UsuariosFiltros) {
    const condiciones = [];
    if (!filtros.incluirEliminados) {
      condiciones.push(isNull(usuarios.eliminadoEn));
    }
    if (filtros.rol) {
      condiciones.push(eq(usuarios.rol, filtros.rol));
    }
    if (filtros.q) {
      const patron = `%${filtros.q.toLowerCase()}%`;
      condiciones.push(
        or(
          like(sql`lower(${usuarios.email})`, patron),
          like(sql`lower(${usuarios.nombre})`, patron),
        ),
      );
    }
    if (condiciones.length === 0) return undefined;
    if (condiciones.length === 1) return condiciones[0];
    return and(...condiciones);
  }
}

function adaptar(u: Usuario): UsuarioDto {
  return {
    id: u.id,
    email: u.email,
    nombre: u.nombre,
    rol: u.rol,
    suspendido: u.suspendido,
    eliminadoEn: u.eliminadoEn,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}
