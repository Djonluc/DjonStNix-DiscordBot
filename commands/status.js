const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check the current status of the FiveM server.'),
    async execute(interaction) {
        const serverIp = process.env.FIVEM_SERVER_IP || '127.0.0.1:30120';
        const serverUrl = `http://${serverIp}/players.json`;

        await interaction.deferReply();

        try {
            const response = await axios.get(serverUrl, { timeout: 5000 });
            const players = response.data;
            
            // Get Dynamic Info (hostname, etc)
            const infoResponse = await axios.get(`http://${serverIp}/info.json`);
            const info = infoResponse.data;

            const statusEmbed = createEmbed({
                title: '⚡ Server Heartbeat',
                description: `Live status for **${process.env.SERVER_NAME || 'DjonStNix Elite'}**`,
                color: COLORS.GREEN,
                fields: [
                    { name: 'Status', value: '🟢 Online', inline: true },
                    { name: 'Players', value: `👤 ${players.length} / ${info.vars.sv_maxclients || 75}`, inline: true },
                    { name: 'Uptime', value: `⏱️ ${info.vars.Uptime || 'Unknown'}`, inline: true },
                    { name: 'IP Address', value: `\`${serverIp}\``, inline: false }
                ],
                thumbnail: 'https://i.imgur.com/8QdY6kM.png' // Replace with your logo
            });

            await interaction.editReply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('[STATUS ERROR]', error.message);
            
            const offlineEmbed = createEmbed({
                title: '⚡ Server Heartbeat',
                description: `Live status for **${process.env.SERVER_NAME || 'DjonStNix Elite'}**`,
                color: COLORS.RED,
                fields: [
                    { name: 'Status', value: '🔴 Offline', inline: true },
                    { name: 'Players', value: '👤 0 / 0', inline: true },
                    { name: 'Note', value: 'The server is currently unreachable or undergoing maintenance.', inline: false }
                ]
            });

            await interaction.editReply({ embeds: [offlineEmbed] });
        }
    },
};
