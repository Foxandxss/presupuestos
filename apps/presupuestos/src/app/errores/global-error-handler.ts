import { ErrorHandler, inject, Injectable, isDevMode, NgZone } from '@angular/core';
import { Router } from '@angular/router';

const RUTA_ERROR_GENERICO = '/error';
const CLAVE_RUTA_PREVIA = 'pre-error-ruta-previa';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  handleError(error: unknown): void {
    if (isDevMode()) {
      console.error(error);
    }

    if (this.router.url === RUTA_ERROR_GENERICO) {
      return;
    }

    try {
      sessionStorage.setItem(CLAVE_RUTA_PREVIA, this.router.url);
    } catch {
      // sessionStorage puede no estar disponible (SSR/strict)
    }

    this.zone.run(() => {
      void this.router.navigateByUrl(RUTA_ERROR_GENERICO);
    });
  }
}
