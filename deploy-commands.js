require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [

    new SlashCommandBuilder()
    .setName('audit')
    .setDescription('Perform a server wide security scan for roles'),

    new SlashCommandBuilder()
    .setName(`flags`)
    .setDescription(`View flagged users`),

    new SlashCommandBuilder()
    .setName(`kick`)
    .setDescription(`Kick a member from the server`)
    .addUserOption(option =>
        option.setName(`target`)
        .setDescription(`The member to kick`)
        .setRequired(true)
    )
    
    .addStringOption(option =>
        option.setName(`reason`)
        .setDescription(`Reason for the kick`)
        .setRequired(false)
    ),

   new SlashCommandBuilder()
   .setName(`ban`)
   .setDescription(`Ban a member from the server`)
   .addUserOption(option =>
    option.setName(`target`)
    .setDescription(`The member to ban`)
    .setRequired(true)
   
    )

   .addStringOption(option =>
    option.setName(`reason`)
    .setDescription(`Reason for the ban`)
    .setRequired(true)
   ),

   new SlashCommandBuilder()
   .setName("setup")
   .setDescription("Configure the NeuroEX bot for this server")
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