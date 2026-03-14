require('dotenv').config();

const http = require('http');

http.createServer((req, res) => {
  res.end('NeuroEX bot is running!');
}).listen(process.env.PORT || 1000, () => {
  console.log(`HTTP server running on port ${process.env.PORT || 1000}`);
});

const {Client, GatewayIntentBits} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,

    ]
});

client.once('ready', () => {
    console.log(`Bot is online as ${client.user.tag}`);
});

// Handle all slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return; // only handle slash commands

    try {
        if (interaction.commandName === 'register-plate') {
            const plate = interaction.options.getString('plate');
            const owner = interaction.options.getString('player');

            const fs = require('fs');
            let plates = JSON.parse(fs.readFileSync('plates.json'));
            plates[plate] = { owner: owner };
            fs.writeFileSync('plates.json', JSON.stringify(plates, null, 2));

            await interaction.reply({
                content: `✅ Successfully registered a plate to ${plate}, the registered owner is ${owner}`,
                ephemeral: true
            })
        }

        else if (interaction.commandName === 'register-player') {
            const name = interaction.options.getString('name')
            const dob = interaction.options.getString('dob') // dob = Date of Birth
            const residence = interaction.options.getString('residence')
            const occ = interaction.options.getString('occ') // occ = Occupation

            const fs = require('fs');
            let plates = JSON.parse(fs.readFileSync('players.json'));
            name[name] = dob[dob] = residence[residence] = occ[occ]
            fs.writeFileSync('player.json', JSON.stringify(name, null, 2));

            await interaction.reply({
                content: `✅ Successfully registered your player ${name}`,
                ephemeral:true
            })

        }

    } catch (error) {
        console.error(error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'We have detected an error when running the command, please try again or contact support', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORDAPP_TOKEN);