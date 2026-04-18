const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/logger');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unverify')
		.setDescription('Remove verification from a user (Admin Only).')
		.addUserOption(option => 
			option.setName('target')
				.setDescription('The user to unverify')
				.setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
	async execute(interaction) {
		const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');
		const verifiedRoleName = process.env.VERIFIED_ROLE_NAME || 'Verified';

		const hasAdminAccess = interaction.member.roles.cache.some(r => adminRoleIds.includes(r.id)) || 
                               interaction.member.permissions.has(PermissionFlagsBits.Administrator);
		
		if (!hasAdminAccess) {
			const errorEmbed = createEmbed({
                title: '❌ Permission Denied',
                description: 'You do not have the required "Elite Staff" permissions to execute this command.',
                color: COLORS.RED
            });
			return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
		}

		const target = interaction.options.getMember('target');
		const role = interaction.guild.roles.cache.find(r => r.name === verifiedRoleName);

		if (!role) {
			return await interaction.reply({ content: `Role "${verifiedRoleName}" not found!`, ephemeral: true });
		}

		if (!target.roles.cache.has(role.id)) {
			return await interaction.reply({ content: 'That user is not verified!', ephemeral: true });
		}

		try {
			await target.roles.remove(role);

            const successEmbed = createEmbed({
                title: '🛡️ Access Revoked',
                description: `Successfully removed **Verified Access** for ${target.user.tag}.`,
                color: COLORS.RED,
                fields: [
                    { name: 'Target', value: `${target.user}`, inline: true },
                    { name: 'Staff', value: `${interaction.user}`, inline: true },
                    { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                ]
            });

			await interaction.reply({ embeds: [successEmbed], ephemeral: true });
			
			// Log the action
			await logAction(interaction.guild, 'UNVERIFY', target.user, interaction.user);
			
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'Failed to remove verified role!', ephemeral: true });
		}
	},
};

