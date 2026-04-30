import bcrypt from 'bcryptjs';

import { createDatabase } from './connection';
import { meta, usuarios } from './schema';

const db = createDatabase();

const now = new Date().toISOString();

db.insert(meta)
  .values({ key: 'seeded_at', value: now })
  .onConflictDoUpdate({
    target: meta.key,
    set: { value: now },
  })
  .run();

const usuariosSemilla = [
  {
    email: 'admin@presupuestos.local',
    password: 'admin123',
    rol: 'admin' as const,
  },
  {
    email: 'consultor@presupuestos.local',
    password: 'consultor123',
    rol: 'consultor' as const,
  },
];

for (const { email, password, rol } of usuariosSemilla) {
  const passwordHash = bcrypt.hashSync(password, 10);
  db.insert(usuarios)
    .values({ email, passwordHash, rol })
    .onConflictDoUpdate({
      target: usuarios.email,
      set: { passwordHash, rol, updatedAt: now },
    })
    .run();
}

console.log('[db:seed] OK');
