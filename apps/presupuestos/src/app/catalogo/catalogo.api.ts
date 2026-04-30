import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CrearPerfilTecnico,
  CrearProveedor,
  CrearRecurso,
  CrearServicio,
  PerfilTecnico,
  Proveedor,
  Recurso,
  Servicio,
} from './catalogo.types';

@Injectable({ providedIn: 'root' })
export class ProveedoresApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/proveedores';

  list(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(this.base);
  }
  create(dto: CrearProveedor): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.base, dto);
  }
  update(id: number, dto: Partial<CrearProveedor>): Observable<Proveedor> {
    return this.http.patch<Proveedor>(`${this.base}/${id}`, dto);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class PerfilesTecnicosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/perfiles-tecnicos';

  list(): Observable<PerfilTecnico[]> {
    return this.http.get<PerfilTecnico[]>(this.base);
  }
  create(dto: CrearPerfilTecnico): Observable<PerfilTecnico> {
    return this.http.post<PerfilTecnico>(this.base, dto);
  }
  update(
    id: number,
    dto: Partial<CrearPerfilTecnico>,
  ): Observable<PerfilTecnico> {
    return this.http.patch<PerfilTecnico>(`${this.base}/${id}`, dto);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class RecursosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/recursos';

  list(): Observable<Recurso[]> {
    return this.http.get<Recurso[]>(this.base);
  }
  create(dto: CrearRecurso): Observable<Recurso> {
    return this.http.post<Recurso>(this.base, dto);
  }
  update(id: number, dto: Partial<CrearRecurso>): Observable<Recurso> {
    return this.http.patch<Recurso>(`${this.base}/${id}`, dto);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ServiciosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/servicios';

  list(): Observable<Servicio[]> {
    return this.http.get<Servicio[]>(this.base);
  }
  create(dto: CrearServicio): Observable<Servicio> {
    return this.http.post<Servicio>(this.base, dto);
  }
  update(id: number, dto: Partial<CrearServicio>): Observable<Servicio> {
    return this.http.patch<Servicio>(`${this.base}/${id}`, dto);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
