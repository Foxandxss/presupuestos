import bcrypt from 'bcryptjs';

import type { AppDatabase } from '../connection';
import { usuarios } from '../schema';

const USUARIOS_DEMO = [
  { email: 'admin@presupuestos.local', password: 'admin123', rol: 'admin' as const },
  {
    email: 'consultor@presupuestos.local',
    password: 'consultor123',
    rol: 'consultor' as const,
  },
];

export function sembrarUsuarios(db: AppDatabase): void {
  for (const { email, password, rol } of USUARIOS_DEMO) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.insert(usuarios).values({ email, passwordHash, rol }).run();
  }
}
