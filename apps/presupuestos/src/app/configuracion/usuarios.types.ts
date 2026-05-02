import type { Rol } from '../auth/auth.types';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  rol: Rol;
  suspendido: boolean;
  eliminadoEn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsuariosPagina {
  total: number;
  items: Usuario[];
}

export interface UsuariosFiltros {
  limit?: number;
  offset?: number;
  q?: string;
  rol?: Rol;
  incluirEliminados?: boolean;
}

export interface CrearUsuario {
  email: string;
  nombre: string;
  rol: Rol;
  passwordInicial: string;
}

export interface ActualizarUsuario {
  nombre?: string;
  rol?: Rol;
}

export interface ResetPassword {
  nuevaPassword: string;
}

export interface SuspenderUsuario {
  suspendido: boolean;
}
