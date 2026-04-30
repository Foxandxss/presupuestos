import { createDatabase } from './connection';
import { meta } from './schema';

const db = createDatabase();

db.insert(meta)
  .values({ key: 'seeded_at', value: new Date().toISOString() })
  .onConflictDoUpdate({
    target: meta.key,
    set: { value: new Date().toISOString() },
  })
  .run();

console.log('[db:seed] OK');
