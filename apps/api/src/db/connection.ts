import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'path';

import * as schema from './schema';

export type AppDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(filePath?: string) {
  const dbPath =
    filePath ?? process.env.DATABASE_FILE ?? resolve(process.cwd(), 'presupuestos.sqlite');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}
