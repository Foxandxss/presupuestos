import { ApiProperty } from '@nestjs/swagger';

import type { Rol } from '@operaciones/dominio';

export class UsuarioPublicoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'admin@demo.com' })
  email!: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'consultor'] })
  rol!: Rol;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT bearer token' })
  accessToken!: string;

  @ApiProperty({ type: UsuarioPublicoDto })
  usuario!: UsuarioPublicoDto;
}
