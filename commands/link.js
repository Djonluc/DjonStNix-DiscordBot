const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { createEmbed, COLORS } = require('../utils/embeds');

// Generate a random 6-character alphanumeric code
const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Generate a code to link your Discord account to your FiveM Citizen ID.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const discordId = interaction.user.id;

        try {
            // Check if they are already linked or have an active code
            const existing = await db.query('SELECT * FROM djon_discord_links WHERE discord_id = ?', [discordId]);

            if (existing.length > 0) {
                if (existing[0].is_linked) {
                    const linkedEmbed = createEmbed({
                        title: '🔗 Already Linked',
                        description: `Your Discord account is already perfectly synchronized with the server database.\n\n**Citizen ID:** \`${existing[0].citizenid}\`\n**Linked Since:** <t:${Math.floor(new Date(existing[0].linked_at).getTime() / 1000)}:R>`,
                        color: COLORS.GREEN
                    });
                    return await interaction.editReply({ embeds: [linkedEmbed] });
                } else {
                    // Show them their existing code
                    const codeEmbed = createEmbed({
                        title: '🔗 Pending Link',
                        description: `You already have an active code generated. Please load into the server and type the following command in chat:\n\n# \`/linkdiscord ${existing[0].link_code}\``,
                        color: COLORS.GOLD,
                        fields: [
                            { name: 'Expiration', value: 'Codes do not expire until used.', inline: false }
                        ]
                    });
                    return await interaction.editReply({ embeds: [codeEmbed] });
                }
            }

            // Generate a brand new code
            const linkCode = generateCode();

            // Insert into Database
            await db.query(
                'INSERT INTO djon_discord_links (discord_id, link_code) VALUES (?, ?)',
                [discordId, linkCode]
            );

            const successEmbed = createEmbed({
                title: '🔗 Link Code Generated',
                description: `Your unique synchronization code has been created! To complete the bridge between Discord and FiveM, load into the server and type the following into chat:\n\n# \`/linkdiscord ${linkCode}\``,
                color: COLORS.GOLD,
                fields: [
                    { name: 'Security Notice', value: 'Do not share this code with anyone.', inline: false }
                ]
            });

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('[LINK ERROR]', error);
            const failEmbed = createEmbed({
                title: '⚠️ System Error',
                description: 'Failed to generate a link code. The database may be down.',
                color: COLORS.RED
            });
            await interaction.editReply({ embeds: [failEmbed] });
        }
    },
};
