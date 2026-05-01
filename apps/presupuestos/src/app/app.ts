import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PageShellComponent, type UsuarioShell } from '@operaciones/ui/shell';

import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PageShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(AuthService);

  protected readonly autenticado = this.auth.autenticado;

  protected readonly usuarioShell = computed<UsuarioShell | null>(() => {
    const u = this.auth.usuario();
    return u ? { email: u.email, rol: u.rol } : null;
  });

  cerrarSesion(): void {
    this.auth.logout();
  }
}
