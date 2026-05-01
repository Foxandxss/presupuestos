import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const E2E_DB_RELATIVE = 'apps/presupuestos-e2e/.tmp/e2e.sqlite';

function workspaceRoot(): string {
  return resolve(__dirname, '..', '..');
}

// El seed `seed-demo.ts` arranca con `wipeDatos(db)`, asi que no necesitamos
// borrar el fichero de SQLite entre runs (lo cual fallaria con EBUSY si un
// proceso anterior aun lo tiene abierto). Migrar es idempotente, y wipear +
// resembrar deja datos deterministas.
export default async function globalSetup(): Promise<void> {
  const root = workspaceRoot();
  const dbPath = resolve(root, E2E_DB_RELATIVE);
  const tmpDir = resolve(dbPath, '..');

  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const env = { ...process.env, DATABASE_FILE: dbPath };
  const opts = { stdio: 'inherit' as const, cwd: root, env };

  console.log(`[e2e:setup] migrate -> ${dbPath}`);
  execSync('npx tsx apps/api/src/db/migrate.ts', opts);
  console.log('[e2e:setup] seed demo');
  execSync('npx tsx apps/api/src/db/seed-demo.ts', opts);
  console.log('[e2e:setup] OK');
}
