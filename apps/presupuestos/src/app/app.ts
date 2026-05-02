import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

import { CommandPaletteComponent } from '@operaciones/ui/command-palette';
import { PageShellComponent, type UsuarioShell } from '@operaciones/ui/shell';

import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    PageShellComponent,
    CommandPaletteComponent,
    ToastModule,
    ConfirmDialogModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly autenticado = this.auth.autenticado;
  protected readonly paletteAbierto = signal(false);

  protected readonly usuarioShell = computed<UsuarioShell | null>(() => {
    const u = this.auth.usuario();
    return u ? { email: u.email, rol: u.rol } : null;
  });

  cerrarSesion(): void {
    this.auth.logout();
  }

  abrirPalette(): void {
    this.paletteAbierto.set(true);
  }

  cerrarPalette(): void {
    this.paletteAbierto.set(false);
  }

  navegarDesdePalette(ruta: string): void {
    void this.router.navigateByUrl(ruta);
  }
}
