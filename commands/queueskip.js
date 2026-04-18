const { SlashCommandBuilder } = require('discord.js');
const { skipPlayer } = require('../utils/queueServer');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queueskip')
        .setDescription('[ADMIN] Force a player to the front of the server queue.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The Discord user to skip in the queue')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Basic permission check (Must have Manage Server permissions in Discord)
        if (!interaction.member.permissions.has('ManageGuild')) {
            return await interaction.editReply({ content: 'You do not have permission to use this command.' });
        }

        const targetUser = interaction.options.getUser('target');
        
        const success = skipPlayer(targetUser.id);
        if (success) {
            const embed = createEmbed({
                title: '⏩ Queue Skip Executed',
                description: `Successfully jumped ${targetUser.toString()} to Position #1 in the queue.`,
                color: COLORS.GREEN
            });
            await interaction.editReply({ embeds: [embed] });
        } else {
            const failEmbed = createEmbed({
                title: '❌ Not In Queue',
                description: `${targetUser.toString()} is not currently waiting in the connection queue. They must connect to FiveM first.`,
                color: COLORS.RED
            });
            await interaction.editReply({ embeds: [failEmbed] });
        }
    },
};
