import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { CrearProyecto, Proyecto } from './proyectos.types';

@Injectable({ providedIn: 'root' })
export class ProyectosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/proyectos';

  list(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.base);
  }

  get(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.base}/${id}`);
  }

  create(dto: CrearProyecto): Observable<Proyecto> {
    return this.http.post<Proyecto>(this.base, dto);
  }

  update(id: number, dto: Partial<CrearProyecto>): Observable<Proyecto> {
    return this.http.patch<Proyecto>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
