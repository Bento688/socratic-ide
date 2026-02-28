CREATE TABLE `user_quotas` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`message_count` int NOT NULL DEFAULT 0,
	`last_reset_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_quotas_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_quotas_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `user_quotas` ADD CONSTRAINT `user_quotas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;