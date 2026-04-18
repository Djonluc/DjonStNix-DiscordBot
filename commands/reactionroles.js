const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Post a reaction role panel in this channel (Staff Only).')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Title for the panel')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
        const title = interaction.options.getString('title') || 'Self-Assign Roles';

        // Parse REACTION_ROLES from .env
        // Format: REACTION_ROLES=emoji:roleId:label,emoji:roleId:label
        const rawRoles = process.env.REACTION_ROLES || '';

        if (!rawRoles) {
            return await interaction.reply({ 
                content: 'No reaction roles configured. Set `REACTION_ROLES` in your `.env` file.\nFormat: `REACTION_ROLES=🔔:ROLE_ID:Announcements,🎮:ROLE_ID:Gamer,🎵:ROLE_ID:Music`', 
                ephemeral: true 
            });
        }

        const entries = rawRoles.split(',').map(e => {
            const [emoji, roleId, label] = e.trim().split(':');
            return { emoji, roleId, label };
        }).filter(e => e.emoji && e.roleId && e.label);

        if (entries.length === 0) {
            return await interaction.reply({ content: 'Invalid REACTION_ROLES format.', ephemeral: true });
        }

        // Build description from entries
        const description = entries.map(e => `${e.emoji} — **${e.label}**`).join('\n');

        const panelEmbed = createEmbed({
            title: `🏷️ ${title}`,
            description: `Click a button below to toggle a role on or off.\n\n${description}`,
            color: COLORS.GOLD
        });

        // Build buttons (max 5 per row, max 5 rows)
        const rows = [];
        let currentRow = new ActionRowBuilder();

        for (let i = 0; i < entries.length; i++) {
            if (i > 0 && i % 5 === 0) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }

            currentRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_${entries[i].roleId}`)
                    .setLabel(entries[i].label)
                    .setEmoji(entries[i].emoji)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(currentRow);

        await interaction.channel.send({ embeds: [panelEmbed], components: rows });
        await interaction.reply({ content: 'Reaction role panel posted!', ephemeral: true });
    },
};
