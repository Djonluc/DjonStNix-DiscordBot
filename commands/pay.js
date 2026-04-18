const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');
const { createEmbed, COLORS } = require('../utils/embeds');
const { sendTransactionReceipt } = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Transfer bank funds to another linked user.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The Discord user to send money to')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('The amount of money to transfer ($)')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const senderId = interaction.user.id;
        const targetUser = interaction.options.getUser('target');
        const targetId = targetUser.id;
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            return await interaction.editReply({ content: 'Transfer amount must be greater than $0.' });
        }

        if (senderId === targetId) {
            return await interaction.editReply({ content: 'You cannot send money to yourself.' });
        }

        let connection;
        try {
            connection = await db.getConnection();
            await connection.beginTransaction();

            // 1. Check Sender Link
            const [senderLink] = await connection.query('SELECT citizenid FROM djon_discord_links WHERE discord_id = ? AND is_linked = 1', [senderId]);
            if (senderLink.length === 0) {
                await connection.rollback();
                return await interaction.editReply({ content: 'Your account is not linked. Use `/link` first.' });
            }

            // 2. Check Target Link
            const [targetLink] = await connection.query('SELECT citizenid FROM djon_discord_links WHERE discord_id = ? AND is_linked = 1', [targetId]);
            if (targetLink.length === 0) {
                await connection.rollback();
                return await interaction.editReply({ content: 'The target user has not linked their Discord account to the city.' });
            }

            const senderCid = senderLink[0].citizenid;
            const targetCid = targetLink[0].citizenid;
            const framework = global.FiveMFramework || 'qbcore';

            const onlineList = global.onlinePlayers || [];
            if (onlineList.includes(senderCid)) {
                await connection.rollback();
                return await interaction.editReply({ content: 'Transaction Blocked: You are currently online in the server. Please transfer money in-game.' });
            }
            if (onlineList.includes(targetCid)) {
                await connection.rollback();
                return await interaction.editReply({ content: 'Transaction Blocked: The target user is currently online in the server. Wait until they disconnect.' });
            }

            let senderData, targetData;

            if (framework === 'qbcore') {
                const [senderDataResults] = await connection.query('SELECT money FROM players WHERE citizenid = ? FOR UPDATE', [senderCid]);
                const [targetDataResults] = await connection.query('SELECT money FROM players WHERE citizenid = ? FOR UPDATE', [targetCid]);
                senderData = senderDataResults[0]?.money;
                targetData = targetDataResults[0]?.money;
            } else if (framework === 'esx') {
                const [senderDataResults] = await connection.query('SELECT accounts FROM users WHERE identifier = ? FOR UPDATE', [senderCid]);
                const [targetDataResults] = await connection.query('SELECT accounts FROM users WHERE identifier = ? FOR UPDATE', [targetCid]);
                senderData = senderDataResults[0]?.accounts;
                targetData = targetDataResults[0]?.accounts;
            }

            if (!senderData || !targetData) {
                await connection.rollback();
                return await interaction.editReply({ content: 'Critical Error: One or both characters could not be found in the city registry.' });
            }

            const senderMoney = JSON.parse(senderData || '{}');
            const targetMoney = JSON.parse(targetData || '{}');

            const senderBank = parseInt(senderMoney.bank || 0, 10);
            const targetBank = parseInt(targetMoney.bank || 0, 10);

            if (senderBank < amount) {
                await connection.rollback();
                const failEmbed = createEmbed({
                    title: '🏦 Transaction Declined',
                    description: `Insufficient funds. Your current bank balance is **$${senderBank.toLocaleString()}**.`,
                    color: COLORS.RED
                });
                return await interaction.editReply({ embeds: [failEmbed] });
            }

            if (framework === 'qbcore') {
                await connection.query(`UPDATE players SET money = JSON_SET(money, '$.bank', ?) WHERE citizenid = ?`, [senderBank - amount, senderCid]);
                await connection.query(`UPDATE players SET money = JSON_SET(money, '$.bank', ?) WHERE citizenid = ?`, [targetBank + amount, targetCid]);
            } else if (framework === 'esx') {
                await connection.query(`UPDATE users SET accounts = JSON_SET(accounts, '$.bank', ?) WHERE identifier = ?`, [senderBank - amount, senderCid]);
                await connection.query(`UPDATE users SET accounts = JSON_SET(accounts, '$.bank', ?) WHERE identifier = ?`, [targetBank + amount, targetCid]);
            }

            // Commit Transaction Safely
            await connection.commit();

            // 5. Success
            const newBalance = senderBank - amount;
            const successEmbed = createEmbed({
                title: '🏦 Wire Transfer Complete',
                description: `Successfully transferred **$${amount.toLocaleString()}** to ${targetUser.username}.`,
                color: COLORS.GREEN,
                fields: [
                    { name: 'New Balance', value: `$${newBalance.toLocaleString()}`, inline: true },
                    { name: 'Target', value: targetUser.toString(), inline: true },
                    { name: 'Status', value: '🟢 Settled', inline: true }
                ]
            });

            await interaction.editReply({ embeds: [successEmbed] });
            
            // Log the transaction
            await sendTransactionReceipt(interaction.client, interaction.user, targetUser, amount, newBalance);

        } catch (error) {
            console.error('[PAY ERROR]', error);
            if (connection) await connection.rollback();
            const failEmbed = createEmbed({
                title: '⚠️ System Error',
                description: 'The wire transfer failed due to a database error.',
                color: COLORS.RED
            });
            await interaction.editReply({ embeds: [failEmbed] });
        } finally {
            if (connection) connection.release();
        }
    },
};
