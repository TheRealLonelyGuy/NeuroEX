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
            await interaction.deferReply({ ephemeral: true });
            
            const guild = interaction.guild;
            const roles = guild.roles.cache;

            let moderateWarnings = [];
            let highWarnings = [];
            let criticalWarnings = [];
            let score = 100;

            roles.forEach(role => {
                if(role.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    criticalWarnings.push(`🚨 Role **${role.name}** has Administrator permissions!`);
                    score -= 20;
                }

                if (role.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                    highWarnings.push(`⚠️ Role **${role.name}** can manage roles!`)
                    score -= 15;
                }

                if (role.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    highWarnings.push(`⚠️ Role **${role.name}** can ban members!`)
                    score -= 10;
                }

                if (role.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                    moderateWarnings.push(`⚠️ Role **${role.name}** can kick members!`)
                    score -= 10;
                }

                 if (role.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                    moderateWarnings.push(`⚠️ Role **${role.name}** can ping @everyone!`)
                    score -= 5;
                }

                 if (role.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    moderateWarnings.push(`⚠️ Role **${role.name}** can manage messages!`)
                    score -= 10;
                }

                if (role.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    highWarnings.push(`⚠️ Role **${role.name}** can manage channels!`)
                    score -= 10;
                }
            });

            if (score < 0) score = 0;

            const embed = new EmbedBuilder()
            .setTitle('Server Security Audit')
            .setColor(score > 70 ? 'Green' : score > 40 ? 'Yellow' : 'Red')
            .addFields(
                {name: 'Security Score', value: `${score}/100`},
                {
                    name: `🚨 Critical Risks`,
                    value: criticalWarnings.length ? criticalWarnings.join(`\n`) : `None Detected`
                },

                {
                    name: `⚠️ High Risks`,
                    value: highWarnings.length ? highWarnings.join(`\n`) : `None Detected`
                },

                {
                    name: `⚠️ Moderate Risks`,
                    value: moderateWarnings.length ? moderateWarnings.join(`\n`) : `None Detected`
                }
            )
            .setTimestamp()
            .setFooter({ text: 'NeuroEX Corporation • ${guild.name}' });

            await interaction.followUp({ embeds: [embed] });
        }

    } catch (error) {
        console.error(error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'We have detected an error when running the command, please try again or contact support', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORDAPP_TOKEN);