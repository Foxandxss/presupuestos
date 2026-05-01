export const CREDENCIALES = {
  admin: { email: 'admin@demo.com', password: 'admin123' },
  consultor: { email: 'consultor@demo.com', password: 'consultor123' },
} as const;

export type RolDemo = keyof typeof CREDENCIALES;
