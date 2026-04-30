CREATE TABLE `consumos_mensuales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`linea_pedido_id` integer NOT NULL,
	`recurso_id` integer NOT NULL,
	`mes` integer NOT NULL,
	`anio` integer NOT NULL,
	`horas_consumidas` real NOT NULL,
	`fecha_registro` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`linea_pedido_id`) REFERENCES `lineas_pedido`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recurso_id`) REFERENCES `recursos`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consumos_linea_recurso_mes_anio_unique` ON `consumos_mensuales` (`linea_pedido_id`,`recurso_id`,`mes`,`anio`);