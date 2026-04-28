local Core = nil
local Framework = Config.Framework or 'auto'
-- [[ DJONSTNIX ELITE - STANDALONE DISCORD HYBRID BRIDGE ]]
-- Handles: Account Linking, Discord Role Gate on Connect, BEZRUS Priority Queue
-- Does NOT touch any other DjonStNix resource.

-- ============================================================
-- CONFIGURATION (pulled from server convars set in server.cfg)
-- ============================================================
-- Set these in your server.cfg:
--   set discord_bot_token "YOUR_BOT_TOKEN"
--   set discord_guild_id "YOUR_GUILD_ID"
--   set discord_whitelist_role_ids "ROLE_ID_1,ROLE_ID_2,ROLE_ID_3"
--   set discord_gate_enabled "true"
--   set discord_queue_watermark "https://i.imgur.com/YOUR_IMAGE.png" (Optional)

local WATERMARK_URL   = Config.QueueWatermark or GetConvar('discord_queue_watermark', '')

-- Parse comma-separated role IDs into a table
local WHITELIST_ROLES = {}
local rawRoles = GetConvar('discord_whitelist_role_ids', '')
if rawRoles ~= '' then
    for role in rawRoles:gmatch('[^,]+') do
        WHITELIST_ROLES[role:match('^%s*(.-)%s*$')] = true -- trim whitespace
    end
end

-- ============================================================
-- INTERNAL API CONFIGURATION
-- ============================================================
local API_URL = 'http://127.0.0.1:3012/api/queue'

-- ============================================================
-- STARTUP
-- ============================================================
CreateThread(function()
    print('^2[DjonStNix-DiscordBot]^7 Hybrid Bridge Initialized.')
    
    if Framework == 'auto' then
        if GetResourceState('qb-core') == 'started' then
            Framework = 'qbcore'
        elseif GetResourceState('es_extended') == 'started' then
            Framework = 'esx'
        else
            Framework = 'standalone'
        end
    end

    if Framework == 'qbcore' then
        Core = exports['qb-core']:GetCoreObject()
        print('^2[DjonStNix-DiscordBot]^7 Framework Auto-Detected: QBCore')
    elseif Framework == 'esx' then
        Core = exports['es_extended']:getSharedObject()
        print('^2[DjonStNix-DiscordBot]^7 Framework Auto-Detected: ESX Legacy')
    end

    print('^2[DjonStNix-DiscordBot]^7 Queue Authority handed over to Node.js Backend.')

    -- Auto-create tables on start
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `djon_discord_links` (
            `discord_id` VARCHAR(50) NOT NULL PRIMARY KEY,
            `citizenid` VARCHAR(50) DEFAULT NULL,
            `link_code` VARCHAR(10) NOT NULL UNIQUE,
            `is_linked` TINYINT(1) DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `linked_at` TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
    
    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `admin_roles` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `identifier` VARCHAR(60) NOT NULL UNIQUE,
            `role` VARCHAR(50) NOT NULL DEFAULT 'user'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])

    MySQL.query([[
        CREATE TABLE IF NOT EXISTS `djon_discord_apps` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `discord_id` VARCHAR(50) NOT NULL,
            `app_type` VARCHAR(50) NOT NULL,
            `app_data` LONGTEXT NOT NULL,
            `status` VARCHAR(20) DEFAULT 'pending',
            `reviewed_by` VARCHAR(50) DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ]])
end)

-- Background thread: Command the bot to process its queue
CreateThread(function()
    while true do
        Wait(1500)
        local payload = json.encode({
            maxSlots = (Config.MaxPlayers > 0) and Config.MaxPlayers or GetConvarInt('sv_maxclients', 48),
            currentPlayers = #GetPlayers(),
            framework = Framework,
            priorityLevels = Config.PriorityLevels,
            verifiedRole = Config.VerifiedRole
        })
        
        PerformHttpRequest(API_URL .. '/process', function() end, 'POST', payload, {
            ['Content-Type'] = 'application/json'
        })
    end
end)

-- Background thread: Push online players to nodejs to prevent DB overrides
CreateThread(function()
    while true do
        Wait(10000) -- every 10 seconds
        
        local onlineIds = {}
        if Framework == 'qbcore' and Core then
            for _, player in pairs(Core.Functions.GetQBPlayers()) do
                if player and player.PlayerData then
                    table.insert(onlineIds, player.PlayerData.citizenid)
                end
            end
        elseif Framework == 'esx' and Core then
            for _, player in pairs(Core.GetExtendedPlayers()) do
                if player and player.identifier then
                    table.insert(onlineIds, player.identifier)
                end
            end
        end
        
        local payload = json.encode({
            onlinePlayers = onlineIds
        })
        
        PerformHttpRequest(API_URL .. '/bridge/online', function() end, 'POST', payload, {
            ['Content-Type'] = 'application/json'
        })
    end
end)

-- ============================================================
-- HELPER: Extract Discord ID from player identifiers
-- ============================================================
local function GetDiscordId(source)
    for _, id in ipairs(GetPlayerIdentifiers(source)) do
        if string.match(id, 'discord:') then
            return string.gsub(id, 'discord:', '')
        end
    end
    return nil
end

-- ============================================================
-- CONNECTION HANDLER (JS API Proxy)
-- ============================================================
AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    local src = source

    deferrals.defer()
    Wait(0)

    deferrals.update('🔍 Contacting Node.js Bot Process...')

    local discordId = GetDiscordId(src)

    if not discordId then
        deferrals.done([[
╔══════════════════════════════════════╗
║   DjonStNix Elite - Access Denied   ║
╠══════════════════════════════════════╣
║                                     ║
║  Your FiveM account is not linked   ║
║  to a Discord account.              ║
║                                     ║
║  Please open Discord and make sure  ║
║  you are logged in, then restart    ║
║  FiveM with Discord running.        ║
║                                     ║
╚══════════════════════════════════════╝
        ]])
        return
    end

    local payload = json.encode({
        discordId = discordId,
        name = name,
        maxSlots = GetConvarInt('sv_maxclients', 48),
        currentPlayers = #GetPlayers()
    })

    -- 1. Initial Join request sent to NodeJS
    PerformHttpRequest(API_URL .. '/join', function(statusCode, body)
        if statusCode ~= 200 or not body then
            deferrals.done('❌ Local Bot API Offline. Please contact the sever owner.')
            return
        end

        local res = json.decode(body)

        if res.rejectReason == 'NOT_VERIFIED' then
            local msg = string.format("╔══ %s ══╗\n\nYou must have the 'Verified' role in Discord.\nUse /verify\n\n╚═══════════════╝", string.upper(Config.ServerName))
            deferrals.done(msg)
            return
        end

        if res.rejectReason == 'NOT_IN_DISCORD' then
            local msg = string.format("╔══ %s ══╗\n\nYou must physically be inside the %s Discord Server to join the city.\nPlease join via: %s\n\n╚═══════════════╝", string.upper(Config.ServerName), Config.ServerName, Config.DiscordLink or "Discord")
            deferrals.done(msg)
            return
        end

        if res.allowed then
            deferrals.update('✅ Authorization confirmed. Loading into the city...')
            Wait(500)
            deferrals.done()
            return
        end

        -- 2. Player is in queue. Poll the nodejs server every 1.5s
        local isAllowed = false
        while not isAllowed do
            Wait(1500)
            
            -- Did they cancel the connection?
            if not GetPlayerName(src) then
                local dropPayload = json.encode({ discordId = discordId })
                PerformHttpRequest(API_URL .. '/leave', function() end, 'POST', dropPayload, { ['Content-Type'] = 'application/json' })
                return
            end

            PerformHttpRequest(API_URL .. '/status/' .. discordId, function(sc, b)
                if sc == 200 and b then
                    local statusRes = json.decode(b)
                    
                    if statusRes.dropped then
                        isAllowed = true -- Error state bailout
                        deferrals.done('❌ You were dropped from queue.')
                    elseif statusRes.allowed then
                        isAllowed = true
                        deferrals.update('✅ Slot opened! Loading into city...')
                        Wait(500)
                        deferrals.done()
                    else
                        local card = {
                            type = "AdaptiveCard",
                            ["$schema"] = "http://adaptivecards.io/schemas/adaptive-card.json",
                            version = "1.5",
                            fallbackText = "Waiting in Queue...",
                            body = {}
                        }

                        if WATERMARK_URL ~= "" then
                            table.insert(card.body, {
                                type = "Image",
                                url = WATERMARK_URL,
                                horizontalAlignment = "Center",
                                size = "Stretch",
                                spacing = "None"
                            })
                        end

                        table.insert(card.body, {
                            type = "TextBlock",
                            text = string.upper(Config.ServerName),
                            weight = "Bolder",
                            size = "ExtraLarge",
                            horizontalAlignment = "Center",
                            color = Config.QueueThemeColor or "Accent",
                            spacing = "Medium"
                        })
                        
                        table.insert(card.body, {
                            type = "TextBlock",
                            text = Config.QueueSubtitle or "Your slot is being reserved. Please wait.",
                            horizontalAlignment = "Center",
                            isSubtle = true,
                            size = "Small",
                            spacing = "None"
                        })

                        table.insert(card.body, {
                            type = "ColumnSet",
                            spacing = "Large",
                            separator = true,
                            columns = {
                                {
                                    type = "Column",
                                    width = "stretch",
                                    items = {
                                        { type = "TextBlock", text = "POSITION", weight = "Bolder", horizontalAlignment = "Center", isSubtle = true, size = "Small" },
                                        { type = "TextBlock", text = string.format("%d / %d", statusRes.position, statusRes.total), fontType = "Monospace", weight = "Bolder", size = "ExtraLarge", horizontalAlignment = "Center", color = "Good" }
                                    }
                                },
                                {
                                    type = "Column",
                                    width = "stretch",
                                    items = {
                                        { type = "TextBlock", text = "PRIORITY", weight = "Bolder", horizontalAlignment = "Center", isSubtle = true, size = "Small" },
                                        { type = "TextBlock", text = tostring(statusRes.priority), fontType = "Monospace", weight = "Bolder", size = "ExtraLarge", horizontalAlignment = "Center", color = Config.QueueAccentColor or "Warning" }
                                    }
                                }
                            }
                        })

                        table.insert(card.body, {
                            type = "Container",
                            spacing = "Large",
                            separator = true,
                            items = {
                                {
                                    type = "ColumnSet",
                                    columns = {
                                        {
                                            type = "Column",
                                            width = "stretch",
                                            items = {
                                                { type = "TextBlock", text = "WAITING BEHIND", horizontalAlignment = "Right", isSubtle = true, size = "Small" },
                                                { type = "TextBlock", text = "CONNECTING AS", horizontalAlignment = "Right", isSubtle = true, size = "Small" }
                                            }
                                        },
                                        {
                                            type = "Column",
                                            width = "auto",
                                            spacing = "Medium",
                                            items = {
                                                { type = "TextBlock", text = (statusRes.inFront or "Nobody"), weight = "Bolder", size = "Small" },
                                                { type = "TextBlock", text = (statusRes.job and statusRes.job .. " " .. (statusRes.grade or "") or "Unknown"), weight = "Bolder", size = "Small", color = "Accent" }
                                            }
                                        }
                                    }
                                }
                            }
                        })

                        deferrals.presentCard(card)
                    end
                end
            end, 'GET')
        end

    end, 'POST', payload, {
        ['Content-Type'] = 'application/json'
    })
end)

-- ============================================================
-- PLAYER JOINED: Remove from Connecting State
-- ============================================================
AddEventHandler('playerJoining', function()
    local src = source
    local discordId = GetDiscordId(src)
    if discordId then
        local payload = json.encode({ discordId = discordId })
        PerformHttpRequest(API_URL .. '/joined', function() end, 'POST', payload, {
            ['Content-Type'] = 'application/json'
        })
    end
end)

-- ============================================================
-- PLAYER DROP: Cleanup Request
-- ============================================================
AddEventHandler('playerDropped', function()
    local src = source
    local discordId = GetDiscordId(src)
    if discordId then
        local payload = json.encode({ discordId = discordId })
        PerformHttpRequest(API_URL .. '/leave', function() end, 'POST', payload, {
            ['Content-Type'] = 'application/json'
        })
    end
end)

-- ============================================================
-- ACCOUNT LINKING: /linkdiscord [code]
-- ============================================================
RegisterCommand('linkdiscord', function(source, args)
    local src = source
    if src == 0 then return end -- Server console cannot link

    local linkCode = args[1]
    
    local function notify(msg, type)
        if Framework == 'qbcore' and Core then
            TriggerClientEvent('QBCore:Notify', src, msg, type)
        elseif Framework == 'esx' and Core then
            TriggerClientEvent('esx:showNotification', src, msg)
        else
            TriggerClientEvent('chat:addMessage', src, { args = { '^3SYSTEM', msg } })
        end
    end

    if not linkCode then
        notify('Usage: /linkdiscord [code]. Get your code from Discord via /link.', 'error')
        return
    end

    local identifier = nil

    if Framework == 'qbcore' and Core then
        local Player = Core.Functions.GetPlayer(src)
        if Player then identifier = Player.PlayerData.citizenid end
    elseif Framework == 'esx' and Core then
        local Player = Core.GetPlayerFromId(src)
        if Player then identifier = Player.identifier end
    end

    if not identifier then
        notify('Framework player data not found.', 'error')
        return 
    end

    -- Direct DB Check
    MySQL.query('SELECT * FROM djon_discord_links WHERE link_code = ? AND is_linked = 0', { linkCode }, function(results)
        if results and #results > 0 then
            local record = results[1]
            local discordId = record.discord_id

            MySQL.update('UPDATE djon_discord_links SET citizenid = ?, is_linked = 1, linked_at = CURRENT_TIMESTAMP WHERE link_code = ?', {
                identifier, linkCode
            }, function(affectedRows)
                if affectedRows > 0 then
                    notify('Your Discord account has been successfully linked!', 'success')
                    print('^4[DjonStNix-DiscordBot]^7 Account '..discordId..' securely linked to '..identifier)
                else
                    notify('Failed to link account. Database error.', 'error')
                end
            end)
        else
            notify('Invalid or expired link code. Please generate a new one in Discord.', 'error')
        end
    end)
end, false)
