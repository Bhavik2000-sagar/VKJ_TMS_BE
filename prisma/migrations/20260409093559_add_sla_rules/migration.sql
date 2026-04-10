-- CreateTable
CREATE TABLE `SlaRule` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `targetHours` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SlaRule_tenantId_name_key`(`tenantId`, `name`),
    INDEX `SlaRule_tenantId_idx`(`tenantId`),
    INDEX `SlaRule_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Task` ADD COLUMN `slaRuleId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Task_slaRuleId_idx` ON `Task`(`slaRuleId`);

-- AddForeignKey
ALTER TABLE `SlaRule` ADD CONSTRAINT `SlaRule_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_slaRuleId_fkey` FOREIGN KEY (`slaRuleId`) REFERENCES `SlaRule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

