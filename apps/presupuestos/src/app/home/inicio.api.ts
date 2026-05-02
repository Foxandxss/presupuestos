import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { Rol } from '@operaciones/dominio';

import type {
  ActividadFiltros,
  ActividadPagina,
  KpisAdmin,
  KpisConsultor,
} from './inicio.types';

@Injectable({ providedIn: 'root' })
export class InicioApi {
  private readonly http = inject(HttpClient);

  kpisAdmin(): Observable<KpisAdmin> {
    return this.http.get<KpisAdmin>('/api/inicio/kpis', {
      params: new HttpParams().set('rol', 'admin' satisfies Rol),
    });
  }

  kpisConsultor(): Observable<KpisConsultor> {
    return this.http.get<KpisConsultor>('/api/inicio/kpis', {
      params: new HttpParams().set('rol', 'consultor' satisfies Rol),
    });
  }

  actividad(filtros: ActividadFiltros = {}): Observable<ActividadPagina> {
    let params = new HttpParams();
    if (filtros.limit !== undefined)
      params = params.set('limit', String(filtros.limit));
    if (filtros.offset !== undefined)
      params = params.set('offset', String(filtros.offset));
    if (filtros.tipo && filtros.tipo.length > 0) {
      params = params.set('tipo', filtros.tipo.join(','));
    }
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    return this.http.get<ActividadPagina>('/api/actividad', { params });
  }
}
