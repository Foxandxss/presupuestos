import { createDatabase } from './connection';
import { sembrarCatalogo } from './demo/catalogo';
import { crearFaker } from './demo/faker';
import { sembrarPedidos } from './demo/pedidos';
import { sembrarProyectos } from './demo/proyectos';
import { sembrarUsuarios } from './demo/usuarios';
import { wipeDatos } from './demo/wipe';

const db = createDatabase();
const { faker, semilla } = crearFaker();

console.log(`[db:seed:demo] faker seed = ${semilla}`);

wipeDatos(db);
sembrarUsuarios(db);
const catalogo = sembrarCatalogo(db, faker);
const proyectos = sembrarProyectos(db, faker, catalogo.perfilesIds);
sembrarPedidos(db, faker, catalogo, proyectos.proyectosIds);

console.log('[db:seed:demo] OK');
