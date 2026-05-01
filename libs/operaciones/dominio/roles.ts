export const Rol = {
  Admin: 'admin',
  Consultor: 'consultor',
} as const;

export type Rol = (typeof Rol)[keyof typeof Rol];
