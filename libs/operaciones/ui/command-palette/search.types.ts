import type { EstadoPedido } from '../../dominio';

export interface PedidoSearchHit {
  readonly id: number;
  readonly estado: EstadoPedido;
  readonly proyectoId: number;
  readonly proyectoNombre: string;
  readonly proveedorId: number;
  readonly proveedorNombre: string;
}

export interface ProyectoSearchHit {
  readonly id: number;
  readonly nombre: string;
}

export interface ProveedorSearchHit {
  readonly id: number;
  readonly nombre: string;
}

export interface SearchResult {
  readonly pedidos: readonly PedidoSearchHit[];
  readonly proyectos: readonly ProyectoSearchHit[];
  readonly proveedores: readonly ProveedorSearchHit[];
}

export const RESULTADO_VACIO: SearchResult = {
  pedidos: [],
  proyectos: [],
  proveedores: [],
};
