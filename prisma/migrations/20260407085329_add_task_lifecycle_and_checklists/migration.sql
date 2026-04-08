-- AlterTable
ALTER TABLE `attachment` ADD COLUMN `checklistItemId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `task` ADD COLUMN `acceptedAt` DATETIME(3) NULL,
    ADD COLUMN `closedAt` DATETIME(3) NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `startedAt` DATETIME(3) NULL,
    ADD COLUMN `submittedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `TaskChecklistItem` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `mandatory` BOOLEAN NOT NULL DEFAULT false,
    `isChecked` BOOLEAN NOT NULL DEFAULT false,
    `checkedAt` DATETIME(3) NULL,
    `checkedById` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaskChecklistItem_taskId_idx`(`taskId`),
    INDEX `TaskChecklistItem_checkedById_idx`(`checkedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskChecklistItem` ADD CONSTRAINT `TaskChecklistItem_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskChecklistItem` ADD CONSTRAINT `TaskChecklistItem_checkedById_fkey` FOREIGN KEY (`checkedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_checklistItemId_fkey` FOREIGN KEY (`checklistItemId`) REFERENCES `TaskChecklistItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
