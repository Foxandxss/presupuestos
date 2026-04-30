CREATE TABLE `estimaciones_perfil` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`proyecto_id` integer NOT NULL,
	`perfil_tecnico_id` integer NOT NULL,
	`horas_estimadas` real NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`perfil_tecnico_id`) REFERENCES `perfiles_tecnicos`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `estimaciones_proyecto_perfil_unique` ON `estimaciones_perfil` (`proyecto_id`,`perfil_tecnico_id`);--> statement-breakpoint
CREATE TABLE `proyectos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`descripcion` text,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `proyectos_nombre_unique` ON `proyectos` (`nombre`);