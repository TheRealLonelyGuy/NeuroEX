require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

    new SlashCommandBuilder()
    .setName('audit')
    .setDescription('Perform a server wide security scan for roles'),

    new SlashCommandBuilder()
    .setName(`flags`)
    .setDescription(`View flagged users`)
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORDAPP_TOKEN);

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