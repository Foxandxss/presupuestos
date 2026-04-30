import type { RolUsuario } from '../db/schema';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolUsuario;
}
