-- [[ DJONSTNIX ELITE - STANDALONE DISCORD BOT SCHEMA ]]
-- This schema represents only the tables needed exclusively by the Discord Bot.
-- We do not modify other DjonStNix resources to ensure separation of concerns.

-- 1. Discord Bot Account Linking
CREATE TABLE IF NOT EXISTS `djon_discord_links` (
    `discord_id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `citizenid` VARCHAR(50) DEFAULT NULL,
    `link_code` VARCHAR(10) NOT NULL UNIQUE,
    `is_linked` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `linked_at` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Discord Applications (Forms filled out in Discord)
CREATE TABLE IF NOT EXISTS `djon_discord_apps` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `discord_id` VARCHAR(50) NOT NULL,
    `app_type` VARCHAR(50) NOT NULL,  -- e.g. 'whitelist', 'police'
    `app_data` LONGTEXT NOT NULL,
    `status` VARCHAR(20) DEFAULT 'pending', -- pending, approved, denied
    `reviewed_by` VARCHAR(50) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
