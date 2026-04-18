const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateRole } = require('../utils/roleManager');
const { logAction } = require('../utils/logger');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('verify')
		.setDescription('Verify your account to access the city.'),
	async execute(interaction) {
		const verifiedRoleName = process.env.VERIFIED_ROLE_NAME || 'Verified';
		
		try {
			const role = await getOrCreateRole(interaction.guild, verifiedRoleName);
			
			if (interaction.member.roles.cache.has(role.id)) {
				return await interaction.reply({ content: 'You are already verified!', ephemeral: true });
			}

			await interaction.member.roles.add(role);

            const successEmbed = createEmbed({
                title: '🛡️ Verification Success',
                description: 'Your identity has been confirmed. Welcome to the **DjonStNix Elite** community.',
                color: COLORS.GOLD,
                fields: [
                    { name: 'Status', value: '🟢 Verified', inline: true },
                    { name: 'Access', value: 'Full City Access', inline: true }
                ]
            });

			await interaction.reply({ embeds: [successEmbed], ephemeral: true });
			
			// Log the action (System log)
			await logAction(interaction.guild, 'VERIFY', interaction.user);
			
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while processing your verification!', ephemeral: true });
		}
	},
};

