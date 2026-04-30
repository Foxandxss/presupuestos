export interface Proveedor {
  id: number;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface PerfilTecnico {
  id: number;
  nombre: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recurso {
  id: number;
  nombre: string;
  proveedorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Servicio {
  id: number;
  proveedorId: number;
  perfilTecnicoId: number;
  tarifaPorHora: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrearProveedor {
  nombre: string;
}

export interface CrearPerfilTecnico {
  nombre: string;
}

export interface CrearRecurso {
  nombre: string;
  proveedorId: number;
}

export interface CrearServicio {
  proveedorId: number;
  perfilTecnicoId: number;
  tarifaPorHora: number;
}
