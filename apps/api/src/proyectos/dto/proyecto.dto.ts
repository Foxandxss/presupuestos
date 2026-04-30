import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CrearEstimacionDto, EstimacionPerfilDto } from './estimacion.dto';

export class CrearProyectoDto {
  @ApiProperty({ example: 'Migración core 2026', minLength: 2, maxLength: 160 })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  nombre!: string;

  @ApiProperty({ required: false, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string;

  @ApiProperty({ example: '2026-04-01', description: 'YYYY-MM-DD' })
  @IsDateString()
  fechaInicio!: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiProperty({ type: [CrearEstimacionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearEstimacionDto)
  @ArrayUnique((e: CrearEstimacionDto) => e.perfilTecnicoId, {
    message: 'Las estimaciones no pueden duplicar el perfil técnico',
  })
  estimaciones?: CrearEstimacionDto[];
}

export class ActualizarProyectoDto extends PartialType(CrearProyectoDto) {}

export class ProyectoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty({ nullable: true })
  descripcion!: string | null;

  @ApiProperty()
  fechaInicio!: string;

  @ApiProperty({ nullable: true })
  fechaFin!: string | null;

  @ApiProperty({ type: [EstimacionPerfilDto] })
  estimaciones!: EstimacionPerfilDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
