require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fetch = require('node-fetch');
const http = require('http');

// ----------------------------
// Keep bot awake
// ----------------------------
const SELF_URL = 'https://neuroex.onrender.com'; // Replace with your URL
http.createServer((req, res) => {
  res.end('NeuroEX bot is running!');
}).listen(process.env.PORT || 1000, () => {
  console.log(`HTTP server running on port ${process.env.PORT || 1000}`);
});

setInterval(async () => {
  try {
    await fetch(SELF_URL);
    console.log('✅ Self-ping successful! Bot stays awake.');
  } catch (err) {
    console.error('❌ Self-ping failed:', err);
  }
}, 4 * 60 * 1000);

// ----------------------------
// Global storage for flagged users
// ----------------------------
const flaggedUsers = {};

// ----------------------------
// Discord bot setup
// ----------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

// ----------------------------
// Automatic link detection
// ----------------------------
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const urlPattern = /https?:\/\/[^\s]+/i;
  if (!urlPattern.test(message.content)) return;

  const userId = message.author.id;

  if (!flaggedUsers[userId]) flaggedUsers[userId] = 0;
  flaggedUsers[userId]++;

  console.log(`${message.author.tag} sent a link. Total flags: ${flaggedUsers[userId]}`);

  // Alert once at 10, but keep counting
  if (flaggedUsers[userId] === 10) {
    try {
      const owner = await message.guild.fetchOwner();
      await owner.send(
        `🚨 Suspicious behavior detected!\n` +
        `User <@${userId}> has sent 10 links in the server.\n` +
        `Current total: ${flaggedUsers[userId]}`
      );
    } catch (err) {
      console.error('Failed to notify server owner:', err);
    }
  }
});

// ----------------------------
// Slash commands
// ----------------------------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    // ------------------------
    // /audit command
    // ------------------------
    if (interaction.commandName === 'audit') {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const roles = guild.roles.cache;

      let moderateWarnings = [];
      let highWarnings = [];
      let criticalWarnings = [];
      let score = 100;

      roles.forEach(role => {
        if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
          criticalWarnings.push(`Role **${role.name}** has Administrator permissions!`);
          score -= 20;
        } else if (role.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
          highWarnings.push(`Role **${role.name}** can manage roles!`);
          score -= 15;
        } else if (role.permissions.has(PermissionsBitField.Flags.BanMembers)) {
          highWarnings.push(`Role **${role.name}** can ban members!`);
          score -= 10;
        } else if (role.permissions.has(PermissionsBitField.Flags.KickMembers)) {
          moderateWarnings.push(`Role **${role.name}** can kick members!`);
          score -= 10;
        } else if (role.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
          moderateWarnings.push(`Role **${role.name}** can ping @everyone!`);
          score -= 5;
        } else if (role.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
          moderateWarnings.push(`Role **${role.name}** can manage messages!`);
          score -= 10;
        } else if (role.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
          highWarnings.push(`Role **${role.name}** can manage channels!`);
          score -= 10;
        }
      });

      if (score < 0) score = 0;

      const embed = new EmbedBuilder()
        .setTitle('Server Security Audit')
        .setColor(score > 70 ? 'Green' : score > 40 ? 'Yellow' : 'Red')
        .addFields(
          { name: 'Security Score', value: `${score}/100` },
          { name: '🚨 Critical Risks', value: criticalWarnings.length ? criticalWarnings.join('\n') : 'None Detected' },
          { name: '⚠️ High Risks', value: highWarnings.length ? highWarnings.join('\n') : 'None Detected' },
          { name: '⚠️ Moderate Risks', value: moderateWarnings.length ? moderateWarnings.join('\n') : 'None Detected' }
        )
        .setTimestamp()
        .setFooter({ text: `NeuroEX Corporation • ${guild.name}` });

      await interaction.followUp({ embeds: [embed] });
    }

    // ------------------------
    // /flags command
    // ------------------------
    else if (interaction.commandName === 'flags') {
      let output = Object.entries(flaggedUsers)
        .map(([id, count]) => `<@${id}> — ${count} flags`)
        .join('\n');

      if (!output) output = "No users currently flagged.";

      await interaction.reply({ content: `🚩 **Flagged Users**\n\n${output}`, ephemeral: true });
    }

  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'An error occurred while running the command.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORDAPP_TOKEN);