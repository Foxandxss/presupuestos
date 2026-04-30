export type Rol = 'admin' | 'consultor';

export interface UsuarioPublico {
  id: number;
  email: string;
  rol: Rol;
}

export interface LoginResponse {
  accessToken: string;
  usuario: UsuarioPublico;
}
