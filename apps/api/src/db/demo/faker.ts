import { Faker, es } from '@faker-js/faker';

export const SEMILLA_DEFECTO = 42;

export type FakerEs = Faker;

export function crearFaker(): { faker: FakerEs; semilla: number } {
  const semilla = process.env.SEED_RANDOM === '1' ? Date.now() : SEMILLA_DEFECTO;
  const faker = new Faker({ locale: [es] });
  faker.seed(semilla);
  return { faker, semilla };
}
