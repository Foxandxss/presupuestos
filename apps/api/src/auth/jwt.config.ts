import type { SignOptions } from 'jsonwebtoken';

export const JWT_SECRET =
  process.env.JWT_SECRET ?? 'presupuestos-dev-secret-change-me';

export const JWT_EXPIRES_IN: SignOptions['expiresIn'] = (process.env
  .JWT_EXPIRES_IN ?? '12h') as SignOptions['expiresIn'];
