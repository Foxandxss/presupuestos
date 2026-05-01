import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ErrorStateComponent } from '@operaciones/ui/listado';

@Component({
  selector: 'app-pagina-no-encontrada',
  standalone: true,
  imports: [ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pre-pagina-error">
      <pre-error-state
        titulo="No se ha encontrado lo que buscabas"
        descripcion="La página que intentas abrir no existe o se movió de sitio."
        iconoNombre="recursoNoEncontrado"
        etiquetaAccion="Volver al inicio"
        (reintentar)="volverAlInicio()"
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
      .pre-pagina-error :host pre-error-state,
      .pre-pagina-error pre-error-state {
        max-width: 480px;
        width: 100%;
      }
    `,
  ],
})
export class PaginaNoEncontradaPage {
  private readonly router = inject(Router);

  protected volverAlInicio(): void {
    void this.router.navigateByUrl('/inicio');
  }
}
