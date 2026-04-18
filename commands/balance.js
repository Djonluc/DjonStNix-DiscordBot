const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { createEmbed, COLORS } = require('../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your in-game bank and cash balance.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const discordId = interaction.user.id;

        try {
            // 1. Check if the user is linked
            const linkData = await db.query('SELECT citizenid FROM djon_discord_links WHERE discord_id = ? AND is_linked = 1', [discordId]);

            if (linkData.length === 0) {
                const unlinkedEmbed = createEmbed({
                    title: '⚠️ Unauthorized Access',
                    description: 'Your Discord account is not linked to a FiveM character.\n\nPlease use the `/link` command and follow the instructions to connect your accounts.',
                    color: COLORS.RED
                });
                return await interaction.editReply({ embeds: [unlinkedEmbed] });
            }

            const citizenid = linkData[0].citizenid;
            const framework = global.FiveMFramework || 'qbcore';

            let playerData;
            let fullName = 'Unknown Player';
            let money = {};
            let jobLabel = 'Unemployed';
            let gradeLabel = '';

            if (framework === 'qbcore') {
                playerData = await db.query('SELECT charinfo, money, job FROM players WHERE citizenid = ?', [citizenid]);
                if (playerData.length === 0) return await interaction.editReply({ content: 'Character data not found in the database.' });
                
                const player = playerData[0];
                const charinfo = JSON.parse(player.charinfo || '{}');
                money = JSON.parse(player.money || '{}');
                const job = JSON.parse(player.job || '{}');

                fullName = `${charinfo.firstname || ''} ${charinfo.lastname || ''}`.trim() || 'Unknown Player';
                jobLabel = job.label || 'Unemployed';
                gradeLabel = job.grade ? job.grade.name : '';
            } else if (framework === 'esx') {
                playerData = await db.query('SELECT firstname, lastname, accounts, job, job_grade FROM users WHERE identifier = ?', [citizenid]);
                if (playerData.length === 0) return await interaction.editReply({ content: 'Character data not found in the database.' });
                
                const player = playerData[0];
                money = JSON.parse(player.accounts || '{}');
                
                fullName = `${player.firstname || ''} ${player.lastname || ''}`.trim() || 'Unknown Player';
                jobLabel = player.job || 'Unemployed';
                gradeLabel = player.job_grade !== undefined ? `Grade ${player.job_grade}` : '';
            } else {
                return await interaction.editReply({ content: 'Framework not yet loaded or unsupported.' });
            }

            // 3. Display the Balance
            const balanceEmbed = createEmbed({
                title: '🏦 Maze Bank Financial Statement',
                description: `Live financial details for **${fullName}** (\`${citizenid}\`).`,
                color: COLORS.GREEN,
                fields: [
                    { name: '💵 Cash on Hand', value: `$${(money.cash || 0).toLocaleString()}`, inline: true },
                    { name: '💳 Bank Balance', value: `$${(money.bank || 0).toLocaleString()}`, inline: true },
                    { name: '🪙 Crypto', value: `${(money.crypto || 0).toLocaleString()}`, inline: true },
                    { name: '💼 Employment', value: `${jobLabel} ${gradeLabel ? `(${gradeLabel})` : ''}`, inline: false }
                ]
            });

            await interaction.editReply({ embeds: [balanceEmbed] });

        } catch (error) {
            console.error('[BALANCE ERROR]', error);
            const failEmbed = createEmbed({
                title: '⚠️ Database Timeout',
                description: 'Failed to securely fetch your financial records. Please try again later.',
                color: COLORS.RED
            });
            await interaction.editReply({ embeds: [failEmbed] });
        }
    },
};
