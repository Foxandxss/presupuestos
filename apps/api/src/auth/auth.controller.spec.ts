import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const loginMock = jest.fn();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login: loginMock } }],
    }).compile();
    controller = moduleRef.get(AuthController);
  });

  it('delega en AuthService.login y devuelve su resultado', async () => {
    const expected = {
      accessToken: 'jwt.token.here',
      usuario: { id: 1, email: 'admin@x.com', rol: 'admin' as const },
    };
    loginMock.mockResolvedValueOnce(expected);

    const result = await controller.login({
      email: 'admin@x.com',
      password: 'admin123',
    });

    expect(loginMock).toHaveBeenCalledWith({
      email: 'admin@x.com',
      password: 'admin123',
    });
    expect(result).toBe(expected);
  });
});
