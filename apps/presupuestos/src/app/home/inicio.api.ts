import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { Rol } from '@operaciones/dominio';

import type {
  ActividadEvento,
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

  actividad(limit = 10): Observable<ActividadEvento[]> {
    return this.http.get<ActividadEvento[]>('/api/actividad', {
      params: new HttpParams().set('limit', String(limit)),
    });
  }
}
