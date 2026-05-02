import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CrearUsuario,
  Usuario,
  UsuariosFiltros,
  UsuariosPagina,
} from './usuarios.types';

@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/usuarios';

  list(filtros: UsuariosFiltros = {}): Observable<UsuariosPagina> {
    let params = new HttpParams();
    if (filtros.limit !== undefined) params = params.set('limit', filtros.limit);
    if (filtros.offset !== undefined)
      params = params.set('offset', filtros.offset);
    if (filtros.q) params = params.set('q', filtros.q);
    if (filtros.rol) params = params.set('rol', filtros.rol);
    if (filtros.incluirEliminados)
      params = params.set('incluirEliminados', 'true');
    return this.http.get<UsuariosPagina>(this.base, { params });
  }

  create(dto: CrearUsuario): Observable<Usuario> {
    return this.http.post<Usuario>(this.base, dto);
  }
}
