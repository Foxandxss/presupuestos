import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearRecursoDto {
  @ApiProperty({ example: 'Ana Pérez', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  proveedorId!: number;
}

export class ActualizarRecursoDto extends PartialType(CrearRecursoDto) {}

export class RecursoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  proveedorId!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
