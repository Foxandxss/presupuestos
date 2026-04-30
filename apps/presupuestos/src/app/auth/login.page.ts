import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
  ],
  templateUrl: './login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

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
        this.error.set(
          err.status === 401
            ? 'Credenciales inválidas.'
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        );
      },
    });
  }
}
