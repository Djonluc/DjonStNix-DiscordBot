const { Events } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
	name: Events.GuildMemberAdd,
	async execute(member) {
		const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
		const guild = member.guild;

		let welcomeChannel = guild.channels.cache.get(welcomeChannelId);
		if (!welcomeChannel) {
			welcomeChannel = guild.channels.cache.find(c => c.name === 'welcome' || c.name === 'chat');
		}

		if (!welcomeChannel) return;

        const welcomeEmbed = createEmbed({
            title: `💎 Welcome to ${guild.name}`,
            description: `Greetings **${member.user.username}**! We are thrilled to have you join our elite community.\n\nFollow the steps below to gain access to the city.`,
            color: COLORS.GOLD,
            thumbnail: member.user.displayAvatarURL(),
            fields: [
                { name: '━━━ How to Get Started ━━━', value: '\u200b', inline: false },
                { name: 'Step 1 → /verify', value: 'Confirm your identity to unlock channels.', inline: false },
                { name: 'Step 2 → /apply', value: 'Submit your whitelist application.', inline: false },
                { name: 'Step 3 → Wait for Approval', value: 'Staff will review your app and notify you.', inline: false },
                { name: 'Step 4 → Connect', value: 'Once approved, connect to FiveM and the server will confirm your role automatically!', inline: false },
                { name: '\u200b', value: `👤 You are member **#${guild.memberCount}**`, inline: false }
            ]
        });

		try {
			await welcomeChannel.send({ content: `Welcome ${member}!`, embeds: [welcomeEmbed] });
		} catch (error) {
			console.error(`[ERROR] Failed to send welcome message: ${error.message}`);
		}
	},
};

