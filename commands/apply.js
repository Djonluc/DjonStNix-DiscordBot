const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Submit an application for server access or a whitelisted job.'),
    async execute(interaction) {
        // Create the Modal Form
        const modal = new ModalBuilder()
            .setCustomId('application_modal')
            .setTitle('Elite Access Application');

        // Text Input: Character Name
        const charNameInput = new TextInputBuilder()
            .setCustomId('char_name')
            .setLabel("What is your character's full name?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('John Doe')
            .setRequired(true);

        // Text Input: Age
        const ageInput = new TextInputBuilder()
            .setCustomId('age')
            .setLabel("What is your real life age?")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('18')
            .setRequired(true);

        // Text Input: Background
        const backgroundInput = new TextInputBuilder()
            .setCustomId('background')
            .setLabel("Briefly describe your character's background")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('My character moved to the city to start anew after...')
            .setRequired(true)
            .setMinLength(50);

        // Add inputs to action rows
        const firstActionRow = new ActionRowBuilder().addComponents(charNameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(ageInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(backgroundInput);

        // Add action rows to modal
        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        // Show the modal to the user
        await interaction.showModal(modal);
    },
};
