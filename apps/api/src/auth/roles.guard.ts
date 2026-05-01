import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Rol } from '@operaciones/dominio';
import type { JwtPayload } from './jwt-payload';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user || !required.includes(user.rol)) {
      throw new ForbiddenException(
        'No tiene permisos suficientes para acceder a este recurso.',
      );
    }

    return true;
  }
}
