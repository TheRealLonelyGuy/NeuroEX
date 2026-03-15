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

const {Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField} = require('discord.js');

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
        if (interaction.commandName === 'audit') {
            const guild = interaction.guild;

            const roles = guild.roles.cache;

            let warnings = [];
            let score = 100;

            roles.forEach(role => {
                if(role.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    warnings.push(`⚠️ Role **${role.name}** can manage roles!`);
                    score -= 15;
                }
            });

            if (score < 0) score = 0;

            const embed = new EmbedBuilder()
            .setTitle('Server Security Audit')
            .setColor(score > 70 ? 'Green' : score > 40 ? 'Yellow' : 'Red')
            .addFields(
                {name: 'Security Score', value: `${score}/100`},
                {name: 'Warnings', value: warnings.length ? warnings.join('\n') : '✅ No issues detected'} 
            )
            .setTimestamp();

            await interaction.deferReply({ embeds: [embed] });
        }

    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply({ content: 'We have detected an error when running the command, please try again or contact support', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORDAPP_TOKEN);