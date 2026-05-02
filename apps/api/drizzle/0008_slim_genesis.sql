ALTER TABLE `historial_pedido` ADD `reconstruido` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TEMP TABLE `__pedidos_a_reconstruir` AS
SELECT id, estado, fecha_solicitud, fecha_aprobacion, updated_at
FROM `pedidos`
WHERE id NOT IN (SELECT DISTINCT pedido_id FROM `historial_pedido`);--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'Borrador', 'Solicitado', 'solicitar', NULL, fecha_solicitud, 1
FROM `__pedidos_a_reconstruir`
WHERE fecha_solicitud IS NOT NULL;--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'Solicitado', 'Aprobado', 'aprobar', NULL, fecha_aprobacion, 1
FROM `__pedidos_a_reconstruir`
WHERE fecha_aprobacion IS NOT NULL;--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'Solicitado', 'Rechazado', 'rechazar', NULL, updated_at, 1
FROM `__pedidos_a_reconstruir`
WHERE estado = 'Rechazado';--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'Aprobado', 'Cancelado', 'cancelar', NULL, updated_at, 1
FROM `__pedidos_a_reconstruir`
WHERE estado = 'Cancelado';--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'Aprobado', 'EnEjecucion', 'consumo_inicial', NULL, updated_at, 1
FROM `__pedidos_a_reconstruir`
WHERE estado = 'EnEjecucion';--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'Aprobado', 'EnEjecucion', 'consumo_inicial', NULL, updated_at, 1
FROM `__pedidos_a_reconstruir`
WHERE estado = 'Consumido';--> statement-breakpoint
INSERT INTO `historial_pedido` (pedido_id, estado_anterior, estado_nuevo, accion, usuario_id, fecha, reconstruido)
SELECT id, 'EnEjecucion', 'Consumido', 'consumo_completo', NULL, updated_at, 1
FROM `__pedidos_a_reconstruir`
WHERE estado = 'Consumido';--> statement-breakpoint
DROP TABLE `__pedidos_a_reconstruir`;
