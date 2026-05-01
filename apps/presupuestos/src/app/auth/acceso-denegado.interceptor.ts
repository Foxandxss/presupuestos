import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

/**
 * Ante un 403 del backend, redirige silenciosamente a /inicio con un toast
 * genérico. Evita revelar la existencia de rutas admin-only mostrando un
 * 403 explícito al consultor.
 *
 * El error se sigue propagando para que la página origen pueda dejar de
 * cargar/limpiar estado si lo necesita.
 */
export const accesoDenegadoInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(MessageService, { optional: true });

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 403) {
        toast?.add({
          severity: 'info',
          summary: 'No hay nada aquí.',
          life: 4000,
        });
        if (router.url !== '/inicio') {
          void router.navigateByUrl('/inicio');
        }
      }
      return throwError(() => err);
    }),
  );
};
