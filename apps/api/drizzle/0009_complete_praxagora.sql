ALTER TABLE `usuarios` ADD `nombre` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `usuarios` ADD `suspendido` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `usuarios` ADD `eliminado_en` text;--> statement-breakpoint
-- Backfill best-effort de nombre para usuarios pre-#17 (toman el local-part
-- del email capitalizado). Se puede re-editar despues por el admin desde
-- la pagina de gestion.
UPDATE `usuarios`
SET `nombre` = UPPER(SUBSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), 1, 1))
            || SUBSTR(SUBSTR(email, 1, INSTR(email, '@') - 1), 2)
WHERE `nombre` = '' AND INSTR(email, '@') > 0;