require('dotenv').config();

const http = require('http');

http.createServer((req, res) => {
  res.end('NeuroEX bot is running!');
}).listen(process.env.PORT || 1000, () => {
  console.log(`HTTP server running on port ${process.env.PORT || 1000}`);
});

const fetch = require('node-fetch'); // Make sure you installed this

const SELF_URL = 'https://neuroex.onrender.com'; // Replace with your Render URL

// Ping your bot every 4 minutes to keep it awake
setInterval(async () => {
    try {
        await fetch(SELF_URL);
        console.log('✅ Self-ping successful! Bot stays awake.');
    } catch (err) {
        console.error('❌ Self-ping failed:', err);
    }
}, 4 * 60 * 1000); // 4 minutes

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
            let plates = {};
            
            if (fs.existsSync('plates.json'))
                plates = JSON.parse(fs.readFileSync('plates.json'));
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
            let players = {};

            if (fs.existsSync('players.json')) {
                players = JSON.parse(fs.readFileSync('players.json'));
            }
            
            players[name] = {
                dob: dob,
                residence: residence,
                occupation: occ
            };

            fs.writeFileSync('players.json', JSON.stringify(players, null, 2));

            await interaction.reply({
                content: `✅ Successfully registered your player **${name}**`,
                ephemeral: true
            })
            
        }

        else if (interaction.commandName === 'search-plate') {
            const fs = require('fs');
            const plate = interaction.options.getString('plate')
            
            let plates = {};
            if (fs.existsSync('plates.json')) {
                plates = JSON.parse(fs.readFileSync('plates.json'));
            }

            if (plates[plate]) {
                await interaction.reply({
                    content: `Plate **${plate}** is registered to **${plates[plate].owner}**`,
                ephemeral: true    
                });
            } else {
                await interaction.reply({
                    content: `Plate **${plate}** is not a registered plate`,
                    ephemeral: true
                });
            }
        }

        else if (interaction.commandName === 'list-plates') {
            const fs = require('fs');
            let plates = {};

            if (fs.existsSync('plates.json')) {
                plates = JSON.parse(fs.readFileSync('plates.json'));
            }

            if (Object.keys(plates).length === 0) {
                await interaction.reply({
                    content: `❌ There are no registered playes yet.`,
                    ephemeral: true
                });
                return;
            }

            const plateList = Object.entries(plates)
            .map(([plate, data]) => `**${plate}** -> ${data.owner}`)
            .join('\n');

            await interaction.reply({
                content: `**Registered Plates:**\n${plateList}`,
                ephemeral: true
            });
        }

        else if (interaction.commandName === 'delete-plate') {
            const fs = require('fs');
            const plate = interaction.options.getString('plate');

            let plates = {};
            if (fs.existsSync(`plates.json`)) {
                plates = JSON.parse(fs.readFileSync(`plates.json`));
            }

            if (!plates[plate]) {
                await interaction.reply({
                    content: `Plate **${plate}** does not exist, check list-plates for valid plates`,
                    ephemeral: true
                });
                return;
            }

            delete plates[plate];
            fs.writeFileSync('plates.json', JSON.stringify(plates, null, 2));

            await interaction.reply({
                content: `Plate **${plate}** has been permanently deleted.`,
                ephemeral: true
            });
        }

    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'We have detected an error when running the command, please try again or contact support', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORDAPP_TOKEN);