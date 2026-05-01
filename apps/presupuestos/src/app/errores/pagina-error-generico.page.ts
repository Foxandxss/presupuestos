import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ErrorStateComponent } from '@operaciones/ui/listado';

@Component({
  selector: 'app-pagina-error-generico',
  standalone: true,
  imports: [ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pre-pagina-error">
      <pre-error-state
        titulo="Algo ha fallado"
        descripcion="Vuelve a intentarlo en unos minutos. Si persiste, contacta con tu administrador."
        iconoNombre="errorGenerico"
        etiquetaAccion="Reintentar"
        (reintentar)="reintentar()"
      />
    </div>
  `,
  styles: [
    `
      .pre-pagina-error {
        min-height: calc(100vh - 96px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
      }
    `,
  ],
})
export class PaginaErrorGenericoPage {
  private readonly router = inject(Router);

  protected reintentar(): void {
    const rutaPrevia = sessionStorage.getItem('pre-error-ruta-previa');
    sessionStorage.removeItem('pre-error-ruta-previa');
    if (rutaPrevia && rutaPrevia !== '/error') {
      void this.router.navigateByUrl(rutaPrevia);
    } else {
      void this.router.navigateByUrl('/inicio');
    }
  }
}
