const { EmbedBuilder } = require('discord.js');

async function sendTransactionReceipt(client, sender, target, amount, senderNewBalance) {
    const logChannelId = process.env.LOG_CHANNEL_ID;
    if (!logChannelId) return; // Silent skip if no channel configured

    try {
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('🏦 Financial Transaction Audit')
            .setColor('#2ecc71') // Green
            .addFields(
                { name: 'Sender', value: `${sender.tag} (<@${sender.id}>)`, inline: true },
                { name: 'Receiver', value: `${target.tag} (<@${target.id}>)`, inline: true },
                { name: 'Amount Transferred', value: `$${amount.toLocaleString()}`, inline: false },
                { name: 'Sender Remaining Balance', value: `$${senderNewBalance.toLocaleString()}`, inline: false }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('[LOGGER] Failed to send transaction receipt:', err);
    }
}

module.exports = {
    sendTransactionReceipt
};
