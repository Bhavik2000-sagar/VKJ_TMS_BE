-- RBAC: RolePermission(roleId, module, action), department hierarchy, drop Permission/UserPermission

-- 1) New join table + backfill from Permission catalog
CREATE TABLE `RolePermission_new` (
    `roleId` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,

    INDEX `RolePermission_module_action_idx` (`module`, `action`),
    PRIMARY KEY (`roleId`, `module`, `action`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `RolePermission_new` (`roleId`, `module`, `action`)
SELECT
  rp.`roleId`,
  CASE p.`action`
    WHEN 'platform.tenant.create' THEN 'PLATFORM'
    WHEN 'platform.tenant.list' THEN 'PLATFORM'
    WHEN 'platform.tenant.manage' THEN 'PLATFORM'
    WHEN 'task.create' THEN 'TASKS'
    WHEN 'task.assign' THEN 'TASKS'
    WHEN 'task.update' THEN 'TASKS'
    WHEN 'task.review' THEN 'TASKS'
    WHEN 'team.view' THEN 'USERS'
    WHEN 'meeting.view' THEN 'MEETINGS'
    WHEN 'meeting.manage' THEN 'MEETINGS'
    WHEN 'report.view' THEN 'REPORTS'
    WHEN 'user.manage' THEN 'USERS'
    WHEN 'role.manage' THEN 'ROLES'
    WHEN 'org.manage' THEN 'DEPARTMENTS'
    WHEN 'settings.hierarchy' THEN 'SETTINGS'
    WHEN 'settings.tenant' THEN 'SETTINGS'
  END AS `module`,
  CASE p.`action`
    WHEN 'platform.tenant.create' THEN 'CREATE'
    WHEN 'platform.tenant.list' THEN 'READ'
    WHEN 'platform.tenant.manage' THEN 'UPDATE'
    WHEN 'task.create' THEN 'CREATE'
    WHEN 'task.assign' THEN 'ASSIGN'
    WHEN 'task.update' THEN 'UPDATE'
    WHEN 'task.review' THEN 'REVIEW'
    WHEN 'team.view' THEN 'READ'
    WHEN 'meeting.view' THEN 'READ'
    WHEN 'meeting.manage' THEN 'UPDATE'
    WHEN 'report.view' THEN 'READ'
    WHEN 'user.manage' THEN 'MANAGE'
    WHEN 'role.manage' THEN 'MANAGE'
    WHEN 'org.manage' THEN 'MANAGE'
    WHEN 'settings.hierarchy' THEN 'HIERARCHY'
    WHEN 'settings.tenant' THEN 'TENANT'
  END AS `action`
FROM `RolePermission` rp
INNER JOIN `Permission` p ON p.`id` = rp.`permissionId`
WHERE p.`action` IN (
  'platform.tenant.create',
  'platform.tenant.list',
  'platform.tenant.manage',
  'task.create',
  'task.assign',
  'task.update',
  'task.review',
  'team.view',
  'meeting.view',
  'meeting.manage',
  'report.view',
  'user.manage',
  'role.manage',
  'org.manage',
  'settings.hierarchy',
  'settings.tenant'
);

-- 2) Replace RolePermission table
ALTER TABLE `RolePermission` DROP FOREIGN KEY `RolePermission_permissionId_fkey`;
DROP TABLE `RolePermission`;
RENAME TABLE `RolePermission_new` TO `RolePermission`;
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3) Drop per-user permission overrides
ALTER TABLE `UserPermission` DROP FOREIGN KEY `UserPermission_userId_fkey`;
ALTER TABLE `UserPermission` DROP FOREIGN KEY `UserPermission_permissionId_fkey`;
DROP TABLE `UserPermission`;

DROP TABLE `Permission`;

-- 4) Department tree + scoped roles
ALTER TABLE `Department` ADD COLUMN `parentId` VARCHAR(191) NULL;
CREATE INDEX `Department_parentId_idx` ON `Department`(`parentId`);
ALTER TABLE `Department` ADD CONSTRAINT `Department_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Role` ADD COLUMN `departmentId` VARCHAR(191) NULL;
CREATE INDEX `Role_departmentId_idx` ON `Role`(`departmentId`);
ALTER TABLE `Role` ADD CONSTRAINT `Role_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
