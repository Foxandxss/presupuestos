export interface EstimacionPerfil {
  id: number;
  proyectoId: number;
  perfilTecnicoId: number;
  horasEstimadas: number;
  createdAt: string;
  updatedAt: string;
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  estimaciones: EstimacionPerfil[];
  createdAt: string;
  updatedAt: string;
}

export interface CrearEstimacion {
  perfilTecnicoId: number;
  horasEstimadas: number;
}

export interface CrearProyecto {
  nombre: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin?: string;
  estimaciones?: CrearEstimacion[];
}
