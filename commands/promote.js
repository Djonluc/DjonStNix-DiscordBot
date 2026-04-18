const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/logger');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('promote')
		.setDescription('Promote a user to a higher role (Admin Only).')
		.addUserOption(option => 
			option.setName('target')
				.setDescription('The user to promote')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('role')
				.setDescription('The role to assign')
				.setRequired(true)
				.addChoices(
					{ name: 'trusted', value: 'trusted' },
					{ name: 'moderator', value: 'moderator' },
					{ name: 'admin', value: 'admin' },
					{ name: 'developer', value: 'developer' }
				))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
	async execute(interaction) {
		const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');

		const hasAdminAccess = interaction.member.roles.cache.some(r => adminRoleIds.includes(r.id)) || 
                               interaction.member.permissions.has(PermissionFlagsBits.Administrator);
		
		if (!hasAdminAccess) {
			const errorEmbed = createEmbed({
                title: '❌ Permission Denied',
                description: 'You do not have the required staff permissions to execute this command.',
                color: COLORS.RED
            });
			return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
		}

		const target = interaction.options.getMember('target');
		const roleName = interaction.options.getString('role');
		
		await interaction.deferReply({ ephemeral: true });

		try {
			const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
			
			if (!role) {
				return await interaction.editReply({ content: `Role "${roleName}" not found in this server! Please create it first.` });
			}

			if (target.roles.cache.has(role.id)) {
				return await interaction.editReply({ content: `${target.user.tag} already has the "${roleName}" role!` });
			}

			await target.roles.add(role);

            const successEmbed = createEmbed({
                title: '⬆️ Promotion Successful',
                description: `Successfully promoted ${target.user.tag} to **${roleName}**.`,
                color: COLORS.GREEN,
                fields: [
                    { name: 'User', value: `${target.user}`, inline: true },
                    { name: 'Role', value: `${role}`, inline: true },
                    { name: 'Staff', value: `${interaction.user}`, inline: true }
                ]
            });

			await interaction.editReply({ embeds: [successEmbed] });
			
			await logAction(interaction.guild, 'PROMOTE', target.user, interaction.user);
			
		} catch (error) {
			console.error(error);
            const failEmbed = createEmbed({
                title: '⚠️ System Error',
                description: `Failed to promote user: ${error.message}`,
                color: COLORS.RED
            });
			await interaction.editReply({ embeds: [failEmbed] });
		}
	},
};
