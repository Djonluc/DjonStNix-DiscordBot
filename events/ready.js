const { Events, ActivityType } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`[READY] 💎 DjonStNix Elite Bot logged in as ${client.user.tag}`);
		console.log(`[READY] Serving ${client.guilds.cache.size} guild(s) with ${client.commands.size} commands.`);

		// Rotating statuses
		const statuses = [
			{ name: 'DjonStNix Elite | /apply', type: ActivityType.Watching },
			{ name: 'cfx.re/join/eqp3bd', type: ActivityType.Playing },
			{ name: '/balance & /pay', type: ActivityType.Watching },
			{ name: '/suggest & /giveaway', type: ActivityType.Listening },
			{ name: 'Support Tickets | /ticketpanel', type: ActivityType.Watching },
			{ name: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} members`, type: ActivityType.Watching },
		];

		let index = 0;

		// Set initial status
		client.user.setPresence({
			activities: [statuses[0]],
			status: 'online',
		});

		// Rotate every 30 seconds
		setInterval(() => {
			index = (index + 1) % statuses.length;
			client.user.setPresence({
				activities: [statuses[index]],
				status: 'online',
			});
		}, 30000);
	},
};

