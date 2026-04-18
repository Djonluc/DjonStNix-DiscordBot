Config = {}

-- ============================================================
-- 💎 DJONSTNIX QUEUE SETTINGS
-- ============================================================

-- Framework Settings
-- Options: "auto", "qbcore", "esx"
Config.Framework = "auto"

-- General Settings
Config.ServerName = "change me" -- Name displayed in queue messages
Config.MaxPlayers = 0 -- Maximum players allowed on the server (Set to 0 to use server.cfg)

-- Theming & UI
Config.QueueWatermark = "https://i.imgur.com/t3h6xCv.png"
Config.QueueThemeColor = "Accent" -- Colors: Accent, Good, Warning, Attention, Default
Config.QueueAccentColor = "Good"
Config.QueueSubtitle = "Hang tight! Chill here until a spot opens up in the city."

-- Discord Security Requirements
Config.VerifiedRole = "Whitelisted" -- The Exact name of the Discord Role required to join the server

-- Priority Levels (Role Name = Power Level)
-- Make sure the role name here perfectly matches your Discord Role names (capitalization doesn't matter)
Config.PriorityLevels = {
    -- Staff Tiers
    ["Owner"] = 1000,
    ["Developer"] = 950,
    ["Staff"] = 900,
    
    -- Paid Tiers
    ["Elite Plus"] = 850,
    ["Elite"] = 800,
    ["Premium Plus"] = 750,
    ["Premium"] = 700,
    ["Supporter Plus"] = 650,
    ["Supporter"] = 600,
    ["Basic Support"] = 550,
    
    -- Free Tiers
    ["Whitelisted"] = 0
}

-- Links
Config.DiscordLink = "discord.gg/DjonStNix"
