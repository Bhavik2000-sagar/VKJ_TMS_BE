/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,employeeCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `employeeCode` VARCHAR(191) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `phone` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_tenantId_employeeCode_key` ON `User`(`tenantId`, `employeeCode`);
