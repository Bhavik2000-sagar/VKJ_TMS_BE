-- AlterTable
ALTER TABLE `meeting` ADD COLUMN `durationMinutes` INTEGER NULL DEFAULT 30,
    ADD COLUMN `meetingLink` VARCHAR(191) NULL,
    ADD COLUMN `preparationNotes` TEXT NULL,
    ADD COLUMN `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM';
