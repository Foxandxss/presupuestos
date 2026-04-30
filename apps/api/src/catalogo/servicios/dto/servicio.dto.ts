import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CrearServicioDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  proveedorId!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  perfilTecnicoId!: number;

  @ApiProperty({ example: 65, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  tarifaPorHora!: number;
}

export class ActualizarServicioDto extends PartialType(CrearServicioDto) {}

export class ServicioDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  proveedorId!: number;

  @ApiProperty()
  perfilTecnicoId!: number;

  @ApiProperty()
  tarifaPorHora!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
