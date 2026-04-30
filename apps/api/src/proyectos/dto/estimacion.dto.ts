import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class CrearEstimacionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  perfilTecnicoId!: number;

  @ApiProperty({ example: 120, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  horasEstimadas!: number;
}

export class ActualizarEstimacionDto extends PartialType(CrearEstimacionDto) {}

export class EstimacionPerfilDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  proyectoId!: number;

  @ApiProperty()
  perfilTecnicoId!: number;

  @ApiProperty()
  horasEstimadas!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
