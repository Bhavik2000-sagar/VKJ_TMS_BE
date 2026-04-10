-- Single bootstrapped tenant admin role: normalize legacy ADMIN code.
UPDATE `Role`
SET `code` = 'COMPANY_ADMIN'
WHERE `tenantId` IS NOT NULL AND `code` = 'ADMIN';
