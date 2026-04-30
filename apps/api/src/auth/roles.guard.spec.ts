import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { JwtPayload } from './jwt-payload';
import { RolesGuard } from './roles.guard';

function makeContext(user: JwtPayload | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('deja pasar si el handler no requiere ningún rol', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(undefined);
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('deja pasar al admin cuando se exige rol admin', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['admin']);
    const guard = new RolesGuard(reflector);

    const ctx = makeContext({ sub: 1, email: 'a@x', rol: 'admin' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rechaza al consultor con 403 cuando se exige admin', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['admin']);
    const guard = new RolesGuard(reflector);

    const ctx = makeContext({ sub: 2, email: 'c@x', rol: 'consultor' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('rechaza si no hay user en la request', () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(['admin']);
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
