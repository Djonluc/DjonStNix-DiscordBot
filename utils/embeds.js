const { EmbedBuilder } = require('discord.js');

const COLORS = {
    GOLD: 0xFFD700,
    BLUE: 0x3B82F6,
    RED: 0xEF4444,
    GREEN: 0x10B981,
    BLACK: 0x1A1A1A
};

const createEmbed = ({ title, description, color = COLORS.GOLD, fields = [], footer = 'DjonStNix FiveM Elite', thumbnail = null }) => {
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: footer });

    if (fields.length) {
        embed.addFields(fields);
    }

    if (thumbnail) {
        embed.setThumbnail(thumbnail);
    }

    return embed;
};

module.exports = { COLORS, createEmbed };
