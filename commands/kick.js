const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { executeRcon } = require('../utils/rcon');
const { createEmbed, COLORS } = require('../utils/embeds');
const { logAction } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a player from the FiveM server via RCON.')
        .addIntegerOption(option => 
            option.setName('server_id')
                .setDescription('The active Server ID of the player to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for kicking the player')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');
        const hasAdminAccess = interaction.member.roles.cache.some(r => adminRoleIds.includes(r.id)) || 
                               interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasAdminAccess) {
            const errorEmbed = createEmbed({
                title: '❌ Permission Denied',
                description: 'You do not have the required "Elite Staff" permissions to execute server console commands.',
                color: COLORS.RED
            });
            return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const serverId = interaction.options.getInteger('server_id');
        const reason = interaction.options.getString('reason') || 'No reason provided by staff.';
        const rconCommand = `clientkick ${serverId} ${reason} - Discord Admin: ${interaction.user.username}`;

        try {
            // Send RCON Command to FiveM Server
            const response = await executeRcon(rconCommand);

            const successEmbed = createEmbed({
                title: '👢 Player Kicked',
                description: `Successfully transmitted RCON kick order to the game server.`,
                color: COLORS.RED,
                fields: [
                    { name: 'Target Server ID', value: `${serverId}`, inline: true },
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Server Response', value: `\`\`\`${response || 'Command executed silently.'}\`\`\``, inline: false }
                ]
            });

            await interaction.editReply({ embeds: [successEmbed] });

            // Log Action internally for audit trails
            await logAction(interaction.guild, 'RCON KICK', `Server ID: ${serverId} | Reason: ${reason}`, interaction.user);

        } catch (error) {
            console.error('[RCON ERROR]', error);
            const failEmbed = createEmbed({
                title: '⚠️ RCON Transmission Failed',
                description: `Unable to connect to the FiveM engine. \n\n\`\`\`${error.message}\`\`\``,
                color: COLORS.RED
            });
            await interaction.editReply({ embeds: [failEmbed] });
        }
    },
};
