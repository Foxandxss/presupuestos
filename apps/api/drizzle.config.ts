import type { Config } from 'drizzle-kit';

export default {
  schema: './apps/api/src/db/schema.ts',
  out: './apps/api/drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_FILE ?? 'presupuestos.sqlite',
  },
} satisfies Config;
