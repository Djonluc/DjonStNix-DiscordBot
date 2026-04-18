const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { executeRcon } = require('../utils/rcon');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a player from the FiveM server via RCON.')
        .addIntegerOption(option => 
            option.setName('server_id')
                .setDescription('The active Server ID of the player to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for banning the player')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');
        const hasAdminAccess = interaction.member.roles.cache.some(r => adminRoleIds.includes(r.id)) || 
                               interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasAdminAccess) {
            const errorEmbed = createEmbed({
                title: '❌ Permission Denied',
                description: 'You do not have the required "Elite Staff" permissions to execute server bans.',
                color: COLORS.RED
            });
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const serverId = interaction.options.getInteger('server_id');
        const reason = interaction.options.getString('reason');
        
        // Execute standard framework ban command via RCON
        // Note: The specific command depends on your framework (qb-core, esx, or txadmin)
        // Adjust 'ban' if your server uses a different RCON syntax (e.g. 'txaBan')
        const rconCommand = `ban ${serverId} ${reason} - Discord Ban by: ${interaction.user.username}`;
        const fallbackKick = `clientkick ${serverId} [BANNED] ${reason}`;

        try {
            // Send RCON Ban Command to FiveM Server
            let response = await executeRcon(rconCommand);
            
            // Also ensure they are immediately removed from the session
            await executeRcon(fallbackKick).catch(() => {});

            const successEmbed = createEmbed({
                title: '🔨 Player Banned',
                description: `Successfully transmitted RCON ban order to the game server.`,
                color: COLORS.RED,
                fields: [
                    { name: 'Target Server ID', value: `${serverId}`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Server Response', value: `\`\`\`${response || 'Ban logged natively.'}\`\`\``, inline: false }
                ]
            });

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('[RCON ERROR]', error);
            const failEmbed = createEmbed({
                title: '⚠️ RCON Transmission Failed',
                description: `Unable to connect to the FiveM engine to process ban. \n\n\`\`\`${error.message}\`\`\``,
                color: COLORS.RED
            });
            await interaction.editReply({ embeds: [failEmbed] });
        }
    },
};
