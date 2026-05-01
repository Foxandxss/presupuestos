import { createDatabase } from './connection';
import { crearFaker } from './demo/faker';
import { sembrarUsuarios } from './demo/usuarios';
import { wipeDatos } from './demo/wipe';

const db = createDatabase();
const { semilla } = crearFaker();

console.log(`[db:seed:demo] faker seed = ${semilla}`);

wipeDatos(db);
sembrarUsuarios(db);

console.log('[db:seed:demo] OK');
