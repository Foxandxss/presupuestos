# ADR-0001 — Primitiva `pre-field` para campos de formulario

**Status:** Accepted
**Date:** 2026-05-03
**Scope:** Contexto `Operaciones` — afecta a `libs/operaciones/ui/dialogos/` y a las páginas de `apps/presupuestos` que usan modales con formularios.

## Contexto

Los 7 modales de creación/edición del catálogo (`proveedores`, `perfiles-tecnicos`, `recursos`, `servicios`, `proyectos`, `pedidos`, `usuarios`) construyen sus campos como DOM ad-hoc dentro del `<ng-content>` del `pre-modal`:

```html
<div class="flex flex-col gap-1">
  <label for="..." class="text-sm text-slate-700">Nombre</label>
  <input pInputText ... />
  @if (...) { <small class="text-red-600">...</small> }
</div>
```

Este patrón (label + control + error + hint) está duplicado en decenas de sitios. Adicionalmente se ha descubierto un bug: las clases utility de Tailwind no se aplican correctamente al contenido proyectado dentro de `<p-dialog>` (que se monta en `<body>` vía portal), lo que rompe visualmente el layout del cuerpo de los modales. El bug expone que el formulario en modal depende de utilities globales que pueden fallar — y que el patrón de campo en sí está fuera del sistema de diseño.

El `consumo-drawer` ya implementa este mismo patrón con CSS scoped (`.pre-drawer__campo`, `.pre-drawer__error-campo`, `.pre-drawer__hint`), lo que valida que el patrón es estable y reutilizable.

## Opciones evaluadas

### A — Solo arreglar el bug de Tailwind

Investigar y corregir por qué Tailwind no llega al contenido del modal. Los modales siguen ensamblando los campos con utilities. Mínima superficie nueva.

Rechazada porque deja el patrón duplicado y frágil: un cambio futuro al estilo de un campo (densidad, error inline, requerido…) obliga a tocar 7 ficheros.

### B — Bug + `pre-field` + `pre-form-stack` + `pre-form-row`

Encapsular tanto el campo individual como el layout del formulario (stack vertical y filas multi-columna). Cero dependencia de Tailwind dentro de modales. Refactorizar el drawer para usar las mismas primitivas.

Rechazada por over-engineering en este momento: solo hay 7 modales y 1 drawer; la duplicación de form-level es contenida. Las primitivas de layout se pueden promover si la duplicación crece.

### C — Bug + `pre-field` (única primitiva nueva)

Encapsular solo el campo. El layout del formulario (stack, filas multi-columna, grids para FormArray) sigue como utilities Tailwind, que ahora funcionan porque el bug subyacente se arregla. El drawer no se toca.

## Decisión

**Opción C.** Crear `<pre-field>` en `libs/operaciones/ui/dialogos/` con la API:

- Inputs: `label?: string`, `controlId?: string`, `error?: string | null`, `hint?: string | null`, `requerido?: boolean`, `ariaLabel?: string`.
- Control proyectado vía `<ng-content>`.
- Estilos scoped al componente (sin Tailwind), nomenclatura BEM en español alineada con el drawer: `pre-field__label`, `pre-field__error`, `pre-field__hint`.
- Cuando `label` está ausente (caso FormArray sin etiqueta visible, p. ej. estimaciones por perfil), no se renderiza el `<label>`. La accesibilidad recae en el llamante: debe pasar `aria-label` al control proyectado.
- `controlId` mantiene el binding `<label for>` ↔ `[inputId]` explícito; sin magia con `ContentChild`.

**Prerequisito:** el bug de Tailwind-en-modal se arregla en un PR previo, porque el form-level layout sigue dependiendo de utilities (`flex flex-col gap-4`, `grid grid-cols-2 gap-4`, etc.).

**Rollout en 3 PRs:**

1. Fix CSS del bug subyacente (pequeño, mergeable independiente).
2. `pre-field` + Storybook + spec + migración del modal de `proyectos` como piloto.
3. Migración mecánica de los 6 modales restantes.

## Consecuencias

- **El drawer se queda como está.** Tiene su CSS funcionando y refactorizarlo no aporta valor inmediato. Si en el futuro aparece un segundo drawer o la divergencia visual molesta, se reabre.
- **No se introducen `pre-form-stack` / `pre-form-row`.** Si la duplicación de `<form class="flex flex-col gap-4">` y `<div class="grid grid-cols-2 gap-4">` se hace dolorosa, se promueven entonces (regla de tres).
- **`CONTEXT.md` no se actualiza.** `pre-field` es UI, no dominio. El glosario sigue siendo exclusivamente dominio.
- **Accesibilidad sin label depende del llamante.** Mitigación: `console.warn` en dev si el control proyectado no tiene `aria-label` y `pre-field` tampoco tiene `label`.

## Revisión

Si Tailwind-en-modal vuelve a romperse tras un upgrade de PrimeNG o de Tailwind, valorar de nuevo la opción B (independencia total de Tailwind dentro de modales).
