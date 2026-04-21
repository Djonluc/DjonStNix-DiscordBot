const { ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Automatically set up logging infrastructure in the Discord server.
 * Creates a category, channels for each log type, and generates webhooks.
 * @param {import('discord.js').Client} client 
 */
async function syncLogChannels(client) {
    const guildId = process.env.GUILD_ID;
    if (!guildId) {
        console.error('[LOG-SETUP] Error: GUILD_ID missing in .env');
        return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error(`[LOG-SETUP] Error: Could not find Guild with ID ${guildId}`);
        return;
    }

    console.log(`[LOG-SETUP] Starting infrastructure sync for: ${guild.name}`);

    // List of channel categories based on DjonStNix-Logs config
    const categories = [
        { key: 'join', name: 'join-leave', icon: '📥' },
        { key: 'leave', name: 'join-leave', icon: '📤' }, // Grouped under same channel
        { key: 'chat', name: 'chat-logs', icon: '💬' },
        { key: 'death', name: 'death-logs', icon: '💀' },
        { key: 'shooting', name: 'combat-activity', icon: '🔫' },
        { key: 'damage', name: 'combat-activity', icon: '🩸' },
        { key: 'explosion', name: 'explosions', icon: '💥' },
        { key: 'nameChange', name: 'identity-changes', icon: '💠' },
        { key: 'resource', name: 'resource-monitor', icon: '⚙️' },
        { key: 'screenshot', name: 'screenshots', icon: '📸' },
        { key: 'txAdmin', name: 'txadmin-logs', icon: '💻' },
        { key: 'items', name: 'inventory-items', icon: '📦' },
        { key: 'money', name: 'money-economy', icon: '💰' },
        { key: 'weapons', name: 'weapon-tracking', icon: '🔫' },
        { key: 'stashes', name: 'stash-interactions', icon: '🗄️' },
        { key: 'police', name: 'police-evidence', icon: '🔒' },
        { key: 'admin', name: 'admin-commands', icon: '⚡' },
        { key: 'suspicious', name: 'anticheat-alerts', icon: '⚠️' },
        { key: 'analytics', name: 'analytics-reports', icon: '📊' },
        { key: 'all', name: 'master-log', icon: '📺' }
    ];

    try {
        // 1. Ensure Category Exists
        let category = guild.channels.cache.find(c => c.name === '🔴 DJONSTNIX LOGS' && c.type === ChannelType.GuildCategory);
        if (!category) {
            category = await guild.channels.create({
                name: '🔴 DJONSTNIX LOGS',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel], // Private by default
                    }
                ]
            });
            console.log(`[LOG-SETUP] Created Category: ${category.name}`);
        }

        const webhookMap = {};
        const createdChannels = new Map();

        // 2. Process each channel
        for (const log of categories) {
            let channel = createdChannels.get(log.name);
            
            // Check if channel already exists in category
            if (!channel) {
                channel = guild.channels.cache.find(c => c.name === log.name && c.parentId === category.id);
            }

            // Create if missing
            if (!channel) {
                channel = await guild.channels.create({
                    name: log.name,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    topic: `System logs for ${log.name} | Managed by DjonStNix-Logs`
                });
                console.log(`[LOG-SETUP] Created Channel: #${channel.name}`);
            }
            createdChannels.set(log.name, channel);

            // 3. Ensure Webhook exists for channel
            const webhooks = await channel.fetchWebhooks();
            let webhook = webhooks.find(wh => wh.name === 'DjonStNix-Logger');
            
            if (!webhook) {
                webhook = await channel.createWebhook({
                    name: 'DjonStNix-Logger',
                    avatar: 'https://i.imgur.com/t3h6xCv.png', // DjonStNix Icon
                });
                console.log(`[LOG-SETUP] Created Webhook for #${channel.name}`);
            }

            webhookMap[log.key] = webhook.url;
        }

        // 4. Save to webhooks.json
        const outputPath = path.join(__dirname, '..', '..', '..', 'DjonStNix-Logs', 'webhooks.json');
        fs.writeFileSync(outputPath, JSON.stringify(webhookMap, null, 4));
        console.log(`[LOG-SETUP] Infrastructure sync complete. URLs saved to: ${outputPath}`);

    } catch (error) {
        console.error('[LOG-SETUP] Critical Error during sync:', error);
    }
}

module.exports = { syncLogChannels };
