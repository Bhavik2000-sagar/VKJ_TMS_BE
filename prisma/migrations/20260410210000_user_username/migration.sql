-- Login identifier: email -> username (globally unique). Tenant invitations store admin username.
-- Keep composite index: FK on tenantId requires an index starting with tenantId.

ALTER TABLE `TenantInvitation` CHANGE `email` `username` VARCHAR(191) NOT NULL;

ALTER TABLE `TenantInvitation` RENAME INDEX `TenantInvitation_tenantId_email_idx` TO `TenantInvitation_tenantId_username_idx`;

ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NOT NULL DEFAULT '';

UPDATE `User` SET `username` = LOWER(TRIM(`email`));

DROP INDEX `User_email_key` ON `User`;
ALTER TABLE `User` DROP COLUMN `email`;

CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);
ALTER TABLE `User` MODIFY `username` VARCHAR(191) NOT NULL;
