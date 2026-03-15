const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

    new SlashCommandBuilder()
    .setName('audit')
    .setDescription('Perform a server wide security scan for roles')
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