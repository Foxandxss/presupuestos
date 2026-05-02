import { ConflictException, Inject, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { and, eq, isNull, like, or, sql } from 'drizzle-orm';

import type { Rol } from '@operaciones/dominio';

import type { Database } from '../db/db.module';
import { DATABASE } from '../db/db.module';
import { usuarios, type Usuario } from '../db/schema';
import { CrearUsuarioDto, UsuarioDto, UsuariosPaginaDto } from './dto/usuario.dto';

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
