import { definePreset } from '@primeuix/themes';
import Aura from '@primeng/themes/aura';

/**
 * Preset propio sobre Aura — paleta violet (primary) sobre slate (surface).
 *
 * Mantiene los design tokens que PrimeNG ya gestiona internamente y deja
 * que nuestros componentes propios `pre-*` lean directamente las CSS vars
 * de tokens.css (--accent, --accent-soft, --text-default, etc.).
 *
 * Sólo retematizamos lo que ven los componentes PrimeNG; el resto del
 * sistema de diseño vive en tokens.css.
 */
export const PresupuestosPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{violet.50}',
      100: '{violet.100}',
      200: '{violet.200}',
      300: '{violet.300}',
      400: '{violet.400}',
      500: '{violet.500}',
      600: '{violet.600}',
      700: '{violet.700}',
      800: '{violet.800}',
      900: '{violet.900}',
      950: '{violet.950}',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
      dark: {
        surface: {
          0: '#ffffff',
          50: '{slate.50}',
          100: '{slate.100}',
          200: '{slate.200}',
          300: '{slate.300}',
          400: '{slate.400}',
          500: '{slate.500}',
          600: '{slate.600}',
          700: '{slate.700}',
          800: '{slate.800}',
          900: '{slate.900}',
          950: '{slate.950}',
        },
      },
    },
  },
});
