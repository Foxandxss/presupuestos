import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import type { AccionPedido, CrearPedido, Pedido } from './pedidos.types';

@Injectable({ providedIn: 'root' })
export class PedidosApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/pedidos';

  list(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.base);
  }

  get(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.base}/${id}`);
  }

  create(dto: CrearPedido): Observable<Pedido> {
    return this.http.post<Pedido>(this.base, dto);
  }

  update(id: number, dto: Partial<CrearPedido>): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.base}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  transitar(id: number, accion: AccionPedido): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.base}/${id}/transicion`, {
      accion,
    });
  }
}
