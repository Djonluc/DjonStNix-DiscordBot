const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');

// Store active giveaways in memory
const activeGiveaways = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start a giveaway (Staff Only).')
        .addStringOption(option =>
            option.setName('prize')
                .setDescription('What are you giving away?')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in minutes')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners (default 1)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        const prize = interaction.options.getString('prize');
        const duration = interaction.options.getInteger('duration');
        const winnerCount = interaction.options.getInteger('winners') || 1;

        if (duration < 1 || duration > 10080) {
            return await interaction.reply({ content: 'Duration must be between 1 minute and 7 days (10080 minutes).', ephemeral: true });
        }

        const endTime = Math.floor(Date.now() / 1000) + (duration * 60);

        const giveawayEmbed = createEmbed({
            title: '🎉 GIVEAWAY',
            description: `**${prize}**\n\nClick the button below to enter!\n\n⏰ Ends: <t:${endTime}:R>\n🏆 Winners: **${winnerCount}**\n🎫 Hosted by: ${interaction.user}`,
            color: COLORS.GOLD
        });

        const enterBtn = new ButtonBuilder()
            .setCustomId('giveaway_enter')
            .setLabel('🎉 Enter Giveaway')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(enterBtn);

        await interaction.reply({ content: '🎉 Giveaway created!', ephemeral: true });
        const msg = await interaction.channel.send({ embeds: [giveawayEmbed], components: [row] });

        // Store giveaway data 
        activeGiveaways.set(msg.id, {
            prize,
            winnerCount,
            endTime,
            channelId: interaction.channel.id,
            hostId: interaction.user.id,
            entries: new Set()
        });

        // Schedule end
        setTimeout(async () => {
            try {
                const giveaway = activeGiveaways.get(msg.id);
                if (!giveaway) return;

                const entries = Array.from(giveaway.entries);
                const winners = [];

                // Pick random unique winners
                const pool = [...entries];
                for (let i = 0; i < Math.min(giveaway.winnerCount, pool.length); i++) {
                    const idx = Math.floor(Math.random() * pool.length);
                    winners.push(pool.splice(idx, 1)[0]);
                }

                const channel = interaction.client.channels.cache.get(giveaway.channelId);
                if (!channel) return;

                let resultDescription;
                if (winners.length === 0) {
                    resultDescription = 'No one entered the giveaway. 😢';
                } else {
                    resultDescription = `**${giveaway.prize}**\n\n🏆 **Winner${winners.length > 1 ? 's' : ''}:** ${winners.map(id => `<@${id}>`).join(', ')}\n\n🎫 Total entries: **${entries.length}**`;
                }

                const endedEmbed = createEmbed({
                    title: '🎉 GIVEAWAY ENDED',
                    description: resultDescription,
                    color: winners.length > 0 ? COLORS.GREEN : COLORS.RED
                });

                // Update the original message
                try {
                    const originalMsg = await channel.messages.fetch(msg.id);
                    await originalMsg.edit({ embeds: [endedEmbed], components: [] });
                } catch (e) {
                    // Message may have been deleted
                }

                // Announce winner in channel
                if (winners.length > 0) {
                    await channel.send({ content: `🎊 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!` });
                }

                activeGiveaways.delete(msg.id);

            } catch (err) {
                console.error('[GIVEAWAY ERROR]', err);
            }
        }, duration * 60 * 1000);
    },

    // Export activeGiveaways so the interaction handler can access it
    activeGiveaways
};
