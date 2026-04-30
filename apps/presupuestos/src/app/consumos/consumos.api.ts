import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { Consumo, ConsumoFiltros, CrearConsumo } from './consumos.types';

@Injectable({ providedIn: 'root' })
export class ConsumosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/consumos';

  list(filtros: ConsumoFiltros = {}): Observable<Consumo[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filtros)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Consumo[]>(this.base, { params });
  }

  create(dto: CrearConsumo): Observable<Consumo> {
    return this.http.post<Consumo>(this.base, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
