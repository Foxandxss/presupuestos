import {
  Directive,
  effect,
  inject,
  input,
  TemplateRef,
  ViewContainerRef,
} from '@angular/core';

import type { Rol } from '@operaciones/dominio';

import { AuthService } from './auth.service';

/**
 * `*preIfRol="Rol.Admin"` — renderiza el contenido sólo cuando el rol del
 * usuario coincide. Acepta también un array `[Rol.Admin, Rol.Consultor]`
 * y la forma negada `*preIfRol="Rol.Admin; not: true"`.
 *
 * La fuente de verdad de seguridad es el backend (`RolesGuard`); esta
 * directiva sólo controla la presentación.
 */
@Directive({
  selector: '[preIfRol]',
  standalone: true,
})
export class PreIfRolDirective {
  readonly preIfRol = input.required<Rol | readonly Rol[]>();
  readonly preIfRolNot = input<boolean>(false);

  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  private renderizado = false;

  constructor() {
    effect(() => {
      const valor = this.preIfRol();
      const permitidos = Array.isArray(valor) ? valor : [valor as Rol];
      const rolActual = this.auth.rol();
      const matches = rolActual !== null && permitidos.includes(rolActual);
      const debeMostrar = this.preIfRolNot() ? !matches : matches;
      this.actualizar(debeMostrar);
    });
  }

  private actualizar(mostrar: boolean): void {
    if (mostrar && !this.renderizado) {
      this.vcr.createEmbeddedView(this.tpl);
      this.renderizado = true;
    } else if (!mostrar && this.renderizado) {
      this.vcr.clear();
      this.renderizado = false;
    }
  }
}
