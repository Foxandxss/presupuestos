import { createDatabase } from './connection';
import { sembrarCatalogo } from './demo/catalogo';
import { crearFaker } from './demo/faker';
import { sembrarProyectos } from './demo/proyectos';
import { sembrarUsuarios } from './demo/usuarios';
import { wipeDatos } from './demo/wipe';

const db = createDatabase();
const { faker, semilla } = crearFaker();

console.log(`[db:seed:demo] faker seed = ${semilla}`);

wipeDatos(db);
sembrarUsuarios(db);
const catalogo = sembrarCatalogo(db, faker);
sembrarProyectos(db, faker, catalogo.perfilesIds);

console.log('[db:seed:demo] OK');
