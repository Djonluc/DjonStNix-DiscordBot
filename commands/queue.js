const { SlashCommandBuilder } = require('discord.js');
const { setQueueState, getQueueState, clearQueue } = require('../utils/queueServer');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('[ADMIN] Manage the FiveM server queue.')
        .addStringOption(option => 
            option.setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable', value: 'enable' },
                    { name: 'Disable', value: 'disable' },
                    { name: 'Restart / Clear', value: 'restart' },
                    { name: 'Status', value: 'status' }
                )),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Basic permission check (Must have Manage Server permissions in Discord)
        if (!interaction.member.permissions.has('ManageGuild')) {
            return await interaction.editReply({ content: 'You do not have permission to use this command.' });
        }

        const action = interaction.options.getString('action');
        let embed;

        if (action === 'enable') {
            setQueueState(true);
            embed = createEmbed({
                title: '✅ Queue Enabled',
                description: 'The server connection queue is now **ACTIVE**. Incoming players will be queued if the server is full.',
                color: COLORS.GREEN
            });
        } else if (action === 'disable') {
            setQueueState(false);
            embed = createEmbed({
                title: '🛑 Queue Disabled',
                description: 'The server connection queue is now **DISABLED**. Incoming players will bypass the queue completely.',
                color: COLORS.RED
            });
        } else if (action === 'restart') {
            clearQueue();
            embed = createEmbed({
                title: '🔄 Queue Restarted',
                description: 'The server connection queue has been fully **CLEARED**. All waiting players have been dropped and must reconnect.',
                color: COLORS.GOLD
            });
        } else if (action === 'status') {
            const isEnabled = getQueueState();
            embed = createEmbed({
                title: '📊 Queue Status',
                description: `The connection queue is currently **${isEnabled ? 'ENABLED' : 'DISABLED'}**.`,
                color: isEnabled ? COLORS.GREEN : COLORS.RED
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
