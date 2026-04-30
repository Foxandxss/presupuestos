import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';

interface FakeUsuario {
  id: number;
  email: string;
  passwordHash: string;
  rol: 'admin' | 'consultor';
}

function fakeDb(rows: FakeUsuario[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  } as unknown as Parameters<typeof construirServicio>[0];
}

function construirServicio(
  db: ConstructorParameters<typeof AuthService>[0],
  jwt: JwtService,
) {
  return new AuthService(db, jwt);
}

describe('AuthService', () => {
  const jwt = new JwtService({ secret: 'test-secret' });

  it('devuelve token y datos del usuario cuando las credenciales son válidas', async () => {
    const passwordHash = bcrypt.hashSync('admin123', 4);
    const service = construirServicio(
      fakeDb([
        { id: 1, email: 'admin@x.com', passwordHash, rol: 'admin' },
      ]),
      jwt,
    );

    const result = await service.login({
      email: 'admin@x.com',
      password: 'admin123',
    });

    expect(result.usuario).toEqual({
      id: 1,
      email: 'admin@x.com',
      rol: 'admin',
    });
    expect(typeof result.accessToken).toBe('string');
    const payload = jwt.verify<{ sub: number; rol: string }>(
      result.accessToken,
    );
    expect(payload.sub).toBe(1);
    expect(payload.rol).toBe('admin');
  });

  it('rechaza con 401 si el usuario no existe', async () => {
    const service = construirServicio(fakeDb([]), jwt);
    await expect(
      service.login({ email: 'nadie@x.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza con 401 si la contraseña no coincide', async () => {
    const passwordHash = bcrypt.hashSync('correcta', 4);
    const service = construirServicio(
      fakeDb([
        { id: 1, email: 'admin@x.com', passwordHash, rol: 'admin' },
      ]),
      jwt,
    );

    await expect(
      service.login({ email: 'admin@x.com', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
