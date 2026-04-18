const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion for the server.')
        .addStringOption(option =>
            option.setName('idea')
                .setDescription('Your suggestion')
                .setRequired(true)),
    async execute(interaction) {
        const idea = interaction.options.getString('idea');
        const suggestChannelId = process.env.SUGGEST_CHANNEL_ID;

        if (!suggestChannelId) {
            return await interaction.reply({ content: 'Suggestion system is not configured. Ask an admin to set `SUGGEST_CHANNEL_ID` in the bot config.', ephemeral: true });
        }

        const suggestChannel = interaction.client.channels.cache.get(suggestChannelId);
        if (!suggestChannel) {
            return await interaction.reply({ content: 'Suggestion channel not found.', ephemeral: true });
        }

        const suggestEmbed = createEmbed({
            title: '💡 New Suggestion',
            description: idea,
            color: COLORS.GOLD,
            fields: [
                { name: 'Submitted By', value: interaction.user.tag, inline: true },
                { name: 'Status', value: '🟡 Under Review', inline: true }
            ],
            thumbnail: interaction.user.displayAvatarURL()
        });

        const msg = await suggestChannel.send({ embeds: [suggestEmbed] });
        await msg.react('⬆️');
        await msg.react('⬇️');

        const ackEmbed = createEmbed({
            title: '✅ Suggestion Submitted',
            description: `Your suggestion has been posted in ${suggestChannel}. The community can now vote on it!`,
            color: COLORS.GREEN
        });

        await interaction.reply({ embeds: [ackEmbed], ephemeral: true });
    },
};
