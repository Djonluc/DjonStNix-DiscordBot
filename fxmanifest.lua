fx_version 'cerulean'
game 'gta5'
author 'DjonStNix'
description 'DjonStNix Standalone Discord Bot - Hybrid Bridge'
version '1.0.0'
shared_scripts {
    'config.lua',
    '@oxmysql/lib/MySQL.lua'
}
server_script 'server/main.lua'
-- This allows the bot to run as a FiveM resource while its Node.js
-- backend handles the Discord connections securely off-thread.

