import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CrearPerfilTecnicoDto {
  @ApiProperty({ example: 'Senior Backend', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre!: string;
}

export class ActualizarPerfilTecnicoDto extends PartialType(
  CrearPerfilTecnicoDto,
) {}

export class PerfilTecnicoDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
