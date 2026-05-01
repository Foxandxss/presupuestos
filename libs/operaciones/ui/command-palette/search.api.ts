import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { RESULTADO_VACIO, type SearchResult } from './search.types';

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/search';

  buscar(q: string): Observable<SearchResult> {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      return of(RESULTADO_VACIO);
    }
    const params = new HttpParams().set('q', trimmed);
    return this.http
      .get<SearchResult>(this.base, { params })
      .pipe(catchError(() => of(RESULTADO_VACIO)));
  }
}
