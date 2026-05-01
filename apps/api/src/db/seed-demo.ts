import { createDatabase } from './connection';
import { sembrarCatalogo } from './demo/catalogo';
import { crearFaker } from './demo/faker';
import { sembrarUsuarios } from './demo/usuarios';
import { wipeDatos } from './demo/wipe';

const db = createDatabase();
const { faker, semilla } = crearFaker();

console.log(`[db:seed:demo] faker seed = ${semilla}`);

wipeDatos(db);
sembrarUsuarios(db);
sembrarCatalogo(db, faker);

console.log('[db:seed:demo] OK');
