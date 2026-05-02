import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import type { Rol } from '@operaciones/dominio';

const ROLES = ['admin', 'consultor'] as const;

export class CrearUsuarioDto {
  @ApiProperty({ format: 'email', maxLength: 200 })
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @ApiProperty({ minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  rol!: Rol;

  @ApiProperty({
    minLength: 8,
    maxLength: 200,
    description:
      'Contraseña inicial. El admin la entrega al usuario por canal externo.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  passwordInicial!: string;
}

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn(ROLES)
  rol?: Rol;
}

export class ResetPasswordDto {
  @ApiProperty({
    minLength: 8,
    maxLength: 200,
    description:
      'Nueva contraseña que el admin entrega al usuario por canal externo.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  nuevaPassword!: string;
}

export class SuspenderUsuarioDto {
  @ApiProperty({
    description:
      'true para suspender el usuario, false para reactivarlo.',
  })
  @IsBoolean()
  suspendido!: boolean;
}

export class UsuariosQuery {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({
    description: 'Substring case-insensitive sobre email o nombre.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn(ROLES)
  rol?: Rol;

  @ApiPropertyOptional({
    description:
      'Cuando es true incluye usuarios soft-deleted en la respuesta. Por defecto se ocultan.',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  incluirEliminados?: boolean;
}

export class UsuarioDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ enum: ROLES })
  rol!: Rol;

  @ApiProperty()
  suspendido!: boolean;

  @ApiProperty({ nullable: true, type: String })
  eliminadoEn!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class UsuariosPaginaDto {
  @ApiProperty({
    description: 'Total de usuarios tras aplicar filtros (sin paginar).',
  })
  total!: number;

  @ApiProperty({ type: [UsuarioDto] })
  items!: UsuarioDto[];
}
