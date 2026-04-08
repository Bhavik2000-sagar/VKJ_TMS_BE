-- AlterTable
ALTER TABLE `task` ADD COLUMN `createdFrom` VARCHAR(191) NOT NULL DEFAULT 'TASK',
    ADD COLUMN `meetingId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Task_meetingId_idx` ON `Task`(`meetingId`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `Meeting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
