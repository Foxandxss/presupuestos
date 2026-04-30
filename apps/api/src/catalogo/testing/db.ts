import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'path';

import * as schema from '../../db/schema';

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const migrationsFolder = resolve(__dirname, '../../../drizzle');

export function makeTestDb(): {
  db: TestDb;
  close: () => void;
} {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return { db, close: () => sqlite.close() };
}
