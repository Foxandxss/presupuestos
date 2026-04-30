import { Global, Module } from '@nestjs/common';

import { createDatabase, AppDatabase } from './connection';

export const DATABASE = Symbol.for('presupuestos.database');

export type Database = AppDatabase;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: () => createDatabase(),
    },
  ],
  exports: [DATABASE],
})
export class DbModule {}
