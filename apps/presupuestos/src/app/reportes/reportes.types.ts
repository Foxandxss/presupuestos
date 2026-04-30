import type { EstadoPedido } from '../pedidos/pedidos.types';

export type DesgloseHoras = 'proyecto-perfil' | 'perfil' | 'proveedor';

export interface ReportePedidosFiltros {
  estado?: EstadoPedido;
  proveedorId?: number;
  proyectoId?: number;
}

export interface FilaReportePedido {
  id: number;
  proyectoId: number;
  proyectoNombre: string;
  proveedorId: number;
  proveedorNombre: string;
  estado: EstadoPedido;
  fechaSolicitud: string | null;
  fechaAprobacion: string | null;
  totalLineas: number;
  totalHorasOfertadas: number;
  totalHorasConsumidas: number;
  importeTotal: number;
}

export interface ReporteHorasFiltros {
  proyectoId?: number;
  proveedorId?: number;
  perfilTecnicoId?: number;
  desglose?: DesgloseHoras;
}

export interface FilaReporteHoras {
  proyectoId: number | null;
  proyectoNombre: string | null;
  perfilTecnicoId: number | null;
  perfilTecnicoNombre: string | null;
  proveedorId: number | null;
  proveedorNombre: string | null;
  horasEstimadas: number;
  horasOfertadas: number;
  horasConsumidas: number;
  horasPendientes: number;
}

export interface ReporteFacturacionFiltros {
  mesDesde?: number;
  anioDesde?: number;
  mesHasta?: number;
  anioHasta?: number;
  anio?: number;
  proveedorId?: number;
  proyectoId?: number;
}

export interface DetalleFacturacion {
  proyectoId: number;
  proyectoNombre: string;
  lineaPedidoId: number;
  pedidoId: number;
  perfilTecnicoId: number;
  perfilTecnicoNombre: string;
  recursoId: number;
  recursoNombre: string;
  horasConsumidas: number;
  precioHora: number;
  importe: number;
}

export interface FilaReporteFacturacion {
  mes: number;
  anio: number;
  proveedorId: number;
  proveedorNombre: string;
  totalEur: number;
  detalle: DetalleFacturacion[];
}
