import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import type { Rol } from './auth.types';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/inicio']);
};

export function roleGuard(...roles: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const rol = auth.rol();
    if (rol && roles.includes(rol)) {
      return true;
    }
    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }
    const toast = inject(MessageService, { optional: true });
    toast?.add({ severity: 'info', summary: 'No hay nada aquí.', life: 4000 });
    return router.createUrlTree(['/inicio']);
  };
}
