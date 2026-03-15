const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    // Register Plate
    new SlashCommandBuilder()
        .setName('register-plate') // command name users type after /
        .setDescription('Registers a vehicle plate for a player') // description seen in Discord
        .addStringOption(option =>
            option.setName('plate') // first argument
                  .setDescription('The plate number')
                  .setRequired(true))
        .addStringOption(option =>
            option.setName('player') // second argument
                  .setDescription('The player who owns the vehicle')
                  .setRequired(true)),

    // Register Player
    new SlashCommandBuilder()
    .setName('register-player')
    .setDescription('Register your player')
    .addStringOption(option =>
        option.setName('name')
        .setDescription('The players name')
            .setRequired(true))
            .addStringOption(option =>
                option.setName('dob')
                .setDescription('Player Date of Birth')
                .setRequired(true))
                .addStringOption(option =>
                    option.setName('residence')
                    .setDescription('Player residence')
                    .setRequired(true))
                    .addStringOption(option =>
                        option.setName('occ')
                        .setDescription('Player occupation')
                        .setRequired(true)),

    // Search For Registered Plate
    new SlashCommandBuilder()
    .setName('search-plate')
    .setDescription('Search for a registered vehicle plate')
    .addStringOption(option =>
        option.setName('plate')
        .setDescription('The plate number to search for')
        .setRequired(true)),
        
    // List All Existing Plates
    new SlashCommandBuilder()
    .setName('list-plates')
    .setDescription('Displays all existing plates'),

    // Delete Plates
    new SlashCommandBuilder()
    .setName('delete-plate')
    .setDescription('Permanently deletes a registered vehicle plate')
    .addStringOption(option =>
        option.setName('plate')
        .setDescription('The plate number to delete')
        .setRequired(true))
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken('MTQ4MTkyOTA4MDcxNzk3MTY2OA.GY0UbV.-4et6dj-EDOCJ4OQ4ZDknxdoyRU29BF1rHHk1c');

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands('1481929080717971668'), // your bot's Application ID
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();