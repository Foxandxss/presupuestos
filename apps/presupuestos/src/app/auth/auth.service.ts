import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import type { LoginResponse, Rol, UsuarioPublico } from './auth.types';

const STORAGE_KEY = 'presupuestos.auth';

interface SesionAlmacenada {
  accessToken: string;
  usuario: UsuarioPublico;
}

function leerSesion(): SesionAlmacenada | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SesionAlmacenada;
    if (parsed.accessToken && parsed.usuario?.email && parsed.usuario.rol) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sesion = signal<SesionAlmacenada | null>(leerSesion());

  readonly usuario = computed<UsuarioPublico | null>(
    () => this.sesion()?.usuario ?? null,
  );
  readonly token = computed<string | null>(
    () => this.sesion()?.accessToken ?? null,
  );
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly rol = computed<Rol | null>(() => this.usuario()?.rol ?? null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((response) => {
          const sesion: SesionAlmacenada = {
            accessToken: response.accessToken,
            usuario: response.usuario,
          };
          this.sesion.set(sesion);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
          }
        }),
      );
  }

  logout(): void {
    this.sesion.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    void this.router.navigateByUrl('/login');
  }

  homeForRol(rol: Rol): string {
    return rol === 'admin' ? '/inicio' : '/inicio';
  }
}
