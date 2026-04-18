const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketpanel')
        .setDescription('Post the support ticket panel in this channel (Staff Only).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        const panelEmbed = createEmbed({
            title: '🎫 DjonStNix Elite Support',
            description: 'Need help? Click the button below to open a private support ticket.\n\nA member of our staff team will assist you shortly.',
            color: COLORS.GOLD,
            fields: [
                { name: '📋 General Support', value: 'Questions, issues, or bugs.', inline: true },
                { name: '💰 Billing & Economy', value: 'Lost items, money issues.', inline: true },
                { name: '🛡️ Report a Player', value: 'Rule-breakers and exploiters.', inline: true }
            ]
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open_general')
                .setLabel('📋 General Support')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_open_billing')
                .setLabel('💰 Billing / Economy')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_open_report')
                .setLabel('🛡️ Report Player')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
        await interaction.reply({ content: 'Ticket panel posted successfully.', ephemeral: true });
    },
};
