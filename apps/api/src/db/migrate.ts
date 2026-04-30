import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { existsSync } from 'fs';
import { resolve } from 'path';

const dbPath =
  process.env.DATABASE_FILE ?? resolve(process.cwd(), 'presupuestos.sqlite');
const migrationsFolder = resolve(__dirname, '../../drizzle');

if (!existsSync(migrationsFolder)) {
  console.log(
    `[db:migrate] No migrations folder yet at ${migrationsFolder}. ` +
      `Run "npm run db:generate" first.`,
  );
  process.exit(0);
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite);
migrate(db, { migrationsFolder });
sqlite.close();
console.log(`[db:migrate] Applied migrations against ${dbPath}`);
