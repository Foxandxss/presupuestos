import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  FilaReporteFacturacion,
  FilaReporteHoras,
  FilaReportePedido,
  ReporteFacturacionFiltros,
  ReporteHorasFiltros,
  ReportePedidosFiltros,
} from './reportes.types';

@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/reportes';

  pedidos(filtros: ReportePedidosFiltros = {}): Observable<FilaReportePedido[]> {
    return this.http.get<FilaReportePedido[]>(`${this.base}/pedidos`, {
      params: paramsDe(filtros),
    });
  }

  horas(filtros: ReporteHorasFiltros = {}): Observable<FilaReporteHoras[]> {
    return this.http.get<FilaReporteHoras[]>(`${this.base}/horas`, {
      params: paramsDe(filtros),
    });
  }

  facturacion(
    filtros: ReporteFacturacionFiltros = {},
  ): Observable<FilaReporteFacturacion[]> {
    return this.http.get<FilaReporteFacturacion[]>(`${this.base}/facturacion`, {
      params: paramsDe(filtros),
    });
  }

  pedidosCsv(filtros: ReportePedidosFiltros = {}): Observable<Blob> {
    return this.descargarCsv('pedidos', paramsDe(filtros));
  }

  horasCsv(filtros: ReporteHorasFiltros = {}): Observable<Blob> {
    return this.descargarCsv('horas', paramsDe(filtros));
  }

  facturacionCsv(filtros: ReporteFacturacionFiltros = {}): Observable<Blob> {
    return this.descargarCsv('facturacion', paramsDe(filtros));
  }

  private descargarCsv(
    recurso: 'pedidos' | 'horas' | 'facturacion',
    params: HttpParams,
  ): Observable<Blob> {
    return this.http.get(`${this.base}/${recurso}`, {
      params: params.set('formato', 'csv'),
      responseType: 'blob',
    });
  }
}

function paramsDe(filtros: object): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filtros)) {
    if (value !== undefined && value !== null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
