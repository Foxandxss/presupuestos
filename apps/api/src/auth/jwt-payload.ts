import type { Rol } from '@operaciones/dominio';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: Rol;
}
