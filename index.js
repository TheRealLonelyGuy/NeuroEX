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

        // You can add more commands here following the same pattern
        // e.g., /plate-search, /register-owner, /player-search, /log-incident

    } catch (error) {
        console.error(error);
        if (!interaction.replied) {
            await interaction.reply({ content: 'We have detected an error when running the command, please try again or contact support', ephemeral: true });
        }
    }
});

client.login('MTQ4MTkyOTA4MDcxNzk3MTY2OA.G-SmHB.z6ASZH1dWfaNx8ddusoBbAHUoC-ZGl1SJ1Tp38')