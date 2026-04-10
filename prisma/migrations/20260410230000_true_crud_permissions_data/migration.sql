/*
  Data migration: convert legacy coarse permissions into true CRUD permissions.

  Legacy representation lived in RolePermission as:
  - USERS.MANAGE
  - ROLES.MANAGE
  - DEPARTMENTS.MANAGE
  - TASKS.UPDATE (used as read/update/delete umbrella)
  - MEETINGS.UPDATE (used as create/update/delete umbrella)
  - SETTINGS.HIERARCHY and SETTINGS.TENANT (used as settings umbrella)
*/

-- USERS.MANAGE -> USERS.CREATE + USERS.UPDATE + USERS.DELETE
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'USERS', 'CREATE' FROM `RolePermission`
WHERE `module` = 'USERS' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'USERS', 'UPDATE' FROM `RolePermission`
WHERE `module` = 'USERS' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'USERS', 'DELETE' FROM `RolePermission`
WHERE `module` = 'USERS' AND `action` = 'MANAGE';
DELETE FROM `RolePermission` WHERE `module` = 'USERS' AND `action` = 'MANAGE';

-- ROLES.MANAGE -> ROLES.READ + ROLES.CREATE + ROLES.UPDATE + ROLES.DELETE
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'ROLES', 'READ' FROM `RolePermission`
WHERE `module` = 'ROLES' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'ROLES', 'CREATE' FROM `RolePermission`
WHERE `module` = 'ROLES' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'ROLES', 'UPDATE' FROM `RolePermission`
WHERE `module` = 'ROLES' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'ROLES', 'DELETE' FROM `RolePermission`
WHERE `module` = 'ROLES' AND `action` = 'MANAGE';
DELETE FROM `RolePermission` WHERE `module` = 'ROLES' AND `action` = 'MANAGE';

-- DEPARTMENTS.MANAGE -> DEPARTMENTS.READ + DEPARTMENTS.CREATE + DEPARTMENTS.UPDATE + DEPARTMENTS.DELETE
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'DEPARTMENTS', 'READ' FROM `RolePermission`
WHERE `module` = 'DEPARTMENTS' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'DEPARTMENTS', 'CREATE' FROM `RolePermission`
WHERE `module` = 'DEPARTMENTS' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'DEPARTMENTS', 'UPDATE' FROM `RolePermission`
WHERE `module` = 'DEPARTMENTS' AND `action` = 'MANAGE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'DEPARTMENTS', 'DELETE' FROM `RolePermission`
WHERE `module` = 'DEPARTMENTS' AND `action` = 'MANAGE';
DELETE FROM `RolePermission` WHERE `module` = 'DEPARTMENTS' AND `action` = 'MANAGE';

-- TASKS.UPDATE previously implied READ/DELETE as well.
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'TASKS', 'READ' FROM `RolePermission`
WHERE `module` = 'TASKS' AND `action` = 'UPDATE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'TASKS', 'DELETE' FROM `RolePermission`
WHERE `module` = 'TASKS' AND `action` = 'UPDATE';

-- MEETINGS.UPDATE previously implied CREATE/DELETE (and READ in practice).
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'MEETINGS', 'READ' FROM `RolePermission`
WHERE `module` = 'MEETINGS' AND `action` = 'UPDATE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'MEETINGS', 'CREATE' FROM `RolePermission`
WHERE `module` = 'MEETINGS' AND `action` = 'UPDATE';
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'MEETINGS', 'DELETE' FROM `RolePermission`
WHERE `module` = 'MEETINGS' AND `action` = 'UPDATE';

-- SETTINGS.HIERARCHY / SETTINGS.TENANT -> SETTINGS.READ + SETTINGS.UPDATE
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'SETTINGS', 'READ' FROM `RolePermission`
WHERE `module` = 'SETTINGS' AND `action` IN ('HIERARCHY', 'TENANT');
INSERT IGNORE INTO `RolePermission` (`roleId`, `module`, `action`)
SELECT `roleId`, 'SETTINGS', 'UPDATE' FROM `RolePermission`
WHERE `module` = 'SETTINGS' AND `action` IN ('HIERARCHY', 'TENANT');
DELETE FROM `RolePermission` WHERE `module` = 'SETTINGS' AND `action` IN ('HIERARCHY', 'TENANT');

