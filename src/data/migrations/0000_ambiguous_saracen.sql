CREATE TABLE `day_records` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`key` text NOT NULL,
	`status` text NOT NULL,
	`tasks` text NOT NULL,
	CONSTRAINT "day_records_status_check" CHECK("day_records"."status" IN ('success', 'failed', 'empty', 'rest'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_records_key_unique` ON `day_records` (`key`);--> statement-breakpoint
CREATE TABLE `goal` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`target` integer NOT NULL,
	`confirmed_key` text NOT NULL,
	CONSTRAINT "goal_target_check" CHECK("goal"."target" IN (1, 2, 3, 4, 7, 14))
);
--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`enabled` integer NOT NULL,
	`hour` integer NOT NULL,
	`minute` integer NOT NULL,
	`weekdays` text NOT NULL,
	`repeat_enabled` integer NOT NULL,
	`repeat_count` integer NOT NULL,
	`repeat_delay_minutes` integer NOT NULL,
	CONSTRAINT "reminders_hour_check" CHECK("reminders"."hour" BETWEEN 0 AND 23),
	CONSTRAINT "reminders_minute_check" CHECK("reminders"."minute" BETWEEN 0 AND 59),
	CONSTRAINT "reminders_repeat_count_check" CHECK("reminders"."repeat_count" BETWEEN 1 AND 3),
	CONSTRAINT "reminders_repeat_delay_minutes_check" CHECK("reminders"."repeat_delay_minutes" BETWEEN 15 AND 240)
);
--> statement-breakpoint
CREATE TABLE `rest_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`start_key` text NOT NULL,
	`end_key` text NOT NULL,
	CONSTRAINT "rest_periods_range_check" CHECK("rest_periods"."start_key" <= "rest_periods"."end_key")
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`color` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `task_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_tags_task_id_tag_id_unique` ON `task_tags` (`task_id`,`tag_id`) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX `task_tags_tag_id_idx` ON `task_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`done` integer NOT NULL,
	`date` text,
	`order_key` text NOT NULL,
	`delay_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tasks_delay_count_check" CHECK("tasks"."delay_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `tasks_date_order_key_idx` ON `tasks` (`date`,`order_key`);