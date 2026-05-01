import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { ICONOS } from '@operaciones/ui/iconos';

import { AuthService } from './auth.service';

interface CredencialDemo {
  readonly etiqueta: string;
  readonly email: string;
  readonly password: string;
}

const CREDENCIALES_DEMO: readonly CredencialDemo[] = [
  { etiqueta: 'Admin', email: 'admin@demo.com', password: 'admin123' },
  { etiqueta: 'Consultor', email: 'consultor@demo.com', password: 'consultor123' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    LucideAngularModule,
    PasswordModule,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly icono = ICONOS;
  protected readonly esDev = isDevMode();
  protected readonly demos = CREDENCIALES_DEMO;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.enviando.set(true);

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: (response) => {
        this.enviando.set(false);
        void this.router.navigateByUrl(this.auth.homeForRol(response.usuario.rol));
      },
      error: (err: HttpErrorResponse) => {
        this.enviando.set(false);
        if (err.status === 401) {
          this.error.set('Email o contraseña inválidos.');
        } else if (err.status >= 500 || err.status === 0) {
          this.error.set('El servidor no responde. Intenta en unos minutos.');
        } else {
          this.error.set('No se pudo iniciar sesión. Inténtalo de nuevo.');
        }
      },
    });
  }

  rellenarDemo(demo: CredencialDemo): void {
    this.form.setValue({ email: demo.email, password: demo.password });
  }
}
