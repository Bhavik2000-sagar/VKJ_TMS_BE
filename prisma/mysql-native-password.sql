-- Run as MySQL admin (e.g. root). Fixes: Unknown authentication plugin `sha256_password`
-- Usage (example): mysql -u root -p < mysql-native-password.sql

-- See which hosts exist for your app user:
-- SELECT user, host, plugin FROM mysql.user WHERE user = 'tms';

-- Switch plugin for common host patterns (run the lines that match your rows from the query above):
ALTER USER 'tms'@'localhost' IDENTIFIED WITH mysql_native_password BY 'tms';
ALTER USER 'tms'@'%' IDENTIFIED WITH mysql_native_password BY 'tms';

FLUSH PRIVILEGES;
