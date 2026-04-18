const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrCreateRole } = require('../utils/roleManager');
const { logAction } = require('../utils/logger');
const { createEmbed, COLORS } = require('../utils/embeds');
const db = require('../utils/database');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('whitelist')
		.setDescription('Whitelists a user to access the city (Admin Only).')
		.addUserOption(option => 
			option.setName('target')
				.setDescription('The user to whitelist')
				.setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
	async execute(interaction) {
		const adminRoleIds = (process.env.ADMIN_ROLES || '').split(',');
		const whitelistRoleName = process.env.WHITELIST_ROLE_NAME || 'Whitelisted';

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
		
		await interaction.deferReply({ ephemeral: true });

		try {
			const role = await getOrCreateRole(interaction.guild, whitelistRoleName);
			
			if (target.roles.cache.has(role.id)) {
				return await interaction.editReply({ content: 'That user is already whitelisted!' });
			}

			// 1. Update Discord Role
			await target.roles.add(role);

			// 2. Sync with FiveM Database (DjonStNix-Admin Bridge)
			// We store the discord ID in the admin_roles or a new whitelist table if preferred.
			// For this ecosystem, we'll ensure they are in the admin_roles with 'user' status or better.
			await db.query(
				'INSERT INTO admin_roles (identifier, role) VALUES (?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
				[`discord:${target.user.id}`, 'user']
			);

            const successEmbed = createEmbed({
                title: '✅ Whitelist Successful',
                description: `Successfully granted **Elite Access** to ${target.user.tag}.`,
                color: COLORS.GOLD,
                fields: [
                    { name: 'User', value: `${target.user}`, inline: true },
                    { name: 'Discord ID', value: `\`${target.user.id}\``, inline: true },
                    { name: 'Database Sync', value: '🟢 Synchronized', inline: true }
                ]
            });

			await interaction.editReply({ embeds: [successEmbed] });
			
			// 3. Log the action
			await logAction(interaction.guild, 'WHITELIST', target.user, interaction.user);
			
		} catch (error) {
			console.error(error);
            const failEmbed = createEmbed({
                title: '⚠️ System Error',
                description: 'Failed to synchronize whitelist with the FiveM database.',
                color: COLORS.RED
            });
			await interaction.editReply({ embeds: [failEmbed] });
		}
	},
};

