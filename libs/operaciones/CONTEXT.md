# Operaciones — CONTEXT

Bounded context que cubre todo el dominio de la aplicación: catálogo de
proveedores, proyectos, ciclo de vida de los pedidos, registro de
consumos mensuales y reportes derivados.

## Glosario

| Término                  | Definición                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Proveedor**            | Empresa con la que contratamos servicios técnicos por hora. Tiene `Recurso`s (personas) y `Servicio`s (oferta por perfil).                                                          |
| **PerfilTecnico**        | Categoría de rol contratable (Senior, Junior, PM, …). No lleva tarifa: la tarifa vive en el `Servicio`.                                                                              |
| **Recurso**              | Persona concreta perteneciente a un `Proveedor`. No tiene `PerfilTecnico` asignado: un mismo recurso puede consumir contra cualquier `Línea` de su proveedor.                       |
| **Servicio**             | Combinación `(Proveedor, PerfilTecnico, TarifaPorHora)`. UNIQUE por par. Es la fuente de tarifas vigentes; se usa para prerrellenar `LineaPedido.PrecioHora`.                       |
| **Proyecto**             | Trabajo bajo el cual se solicitan pedidos. Tiene `Nombre`, `Descripcion?`, `FechaInicio`, `FechaFin?` y una colección de `EstimacionPerfil`.                                        |
| **EstimacionPerfil**     | `(Proyecto, PerfilTecnico, HorasEstimadas)`. UNIQUE por par. Sirve de baseline para los reportes de desviación.                                                                     |
| **Pedido**               | Orden de compra a un `Proveedor` en el contexto de un `Proyecto`. Tiene `LineaPedido`s y un `Estado` (ver máquina abajo). Término canónico — preferir sobre "Presupuesto".          |
| **LineaPedido**          | Detalle dentro de un `Pedido`: `(PerfilTecnico, FechaInicio, FechaFin, HorasOfertadas, PrecioHora)`. La tarifa se hereda del `Servicio` y se **congela al aprobar** el Pedido.       |
| **ConsumoMensual**       | `(LineaPedido, Recurso, Mes, Año, HorasConsumidas)`. UNIQUE en `(linea, recurso, mes, año)`. Sólo se acepta contra Pedidos `Aprobado` o `EnEjecucion`.                              |
| **Tarifa congelada**     | El `PrecioHora` que la `LineaPedido` lleva en el momento de aprobar el Pedido. No se ve afectada por cambios posteriores en el `Servicio` correspondiente.                          |
| **Facturación Mensual**  | **Vista derivada**, no entidad. Se calcula a demanda como `Σ ConsumoMensual.Horas × LineaPedido.PrecioHora` por mes y proveedor con drill-down a líneas y consumos.                  |

## Estados del Pedido

```
Borrador ──solicitar──▶ Solicitado ──aprobar──▶ Aprobado ──[1er consumo]──▶ EnEjecucion ──[todas líneas full]──▶ Consumido
                            │                       │                              │
                            └─rechazar─▶ Rechazado  └─cancelar─▶ Cancelado         └─cancelar─▶ Cancelado
```

- `Rechazado` y `Cancelado` son **terminales y semánticamente distintos**: rechazado = el proveedor o el cliente declinó desde `Solicitado`; cancelado = nosotros lo retiramos desde `Aprobado` o `EnEjecucion`.
- Las transiciones disparadas por consumo (`Aprobado→EnEjecucion`, `EnEjecucion→Consumido`) son **automáticas**, no requieren acción manual.

## Roles

- **`admin`** — gestiona todo el catálogo, los proyectos, los pedidos y dispara las transiciones de estado.
- **`consultor`** — sólo registra `ConsumoMensual` y consulta. No crea pedidos ni aprueba.

## Diálogo de ejemplo

> – ¿Y la facturación mensual? ¿Es una entidad?
> – No, es una **vista derivada**. La calculamos sobre la marcha cruzando los `ConsumoMensual` con la **tarifa congelada** de la `LineaPedido`.
>
> – Vale, y un `Recurso` ¿está atado a un `PerfilTecnico`?
> – No. El `Recurso` pertenece al `Proveedor` y punto. El perfil vive en la `LineaPedido` (qué perfil contratamos), no en la persona.
>
> – ¿Diferencia entre `Rechazado` y `Cancelado`?
> – `Rechazado` lo usa el proveedor/cliente cuando dice que no en `Solicitado`. `Cancelado` lo usamos nosotros para retirar un pedido `Aprobado` o `EnEjecucion`. Reportes y semántica los distinguen.

## Ambigüedades resueltas

- **"Presupuesto" vs "Pedido"** — el dominio canónico es `Pedido`. "Presupuesto" sólo aparece como etiqueta en la UI (es el nombre comercial de la app).
- **Granularidad del consumo** — siempre `(LineaPedido, Recurso, Mes, Año)`. No se aceptan consumos a nivel diario ni agregados a nivel pedido.
- **Tarifa al cambiar el `Servicio` después de aprobar** — los pedidos ya aprobados conservan la tarifa congelada; sólo los pedidos en `Borrador` o `Solicitado` ven la tarifa actualizada al abrir/editar la línea.

## Avoid (lenguaje a evitar en código)

- **Presupuesto** en código (clases, endpoints, DTOs). Sólo en literales de UI.
- **Order** / **Quote** en inglés. El código de dominio va en español: `Pedido`, `LineaPedido`, `ConsumoMensual`. Inglés sólo para framework primitives.
- **Factura** / **Invoice** como entidad. La facturación es vista derivada (`CalculadorFacturacionMensual`).

## Módulos profundos en este contexto

- `MaquinaEstadosPedido` — orquesta transiciones legales del Pedido y sus side effects (congelar tarifas, auto-transiciones).
- `ResolutorTarifa` — devuelve la tarifa vigente del `Servicio` para `(Proveedor, PerfilTecnico)`.
- `ValidadorConsumo` — valida un `ConsumoMensual` propuesto contra todos los invariantes.
- `CalculadorFacturacionMensual` — vista derivada para reportes de facturación.
- `CalculadorEstimacionVsConsumo` — `Estimadas / Ofertadas / Consumidas / Pendientes` con desglose por perfil/proveedor/proyecto.
