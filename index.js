require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder, ChannelSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

// ----------------------------
// Bot config
let serverConfig = fs.existsSync("./config.json") ? JSON.parse(fs.readFileSync("./config.json", "utf8")) : {};
const flaggedUsers = {};
function saveConfig() { fs.writeFileSync("./config.json", JSON.stringify(serverConfig, null, 2)); }

// ----------------------------
// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// ----------------------------
// Bot ready
client.once("ready", () => console.log(`Bot online as ${client.user.tag}`));

// ----------------------------
// Your interaction handler goes here
client.on("interactionCreate", async interaction => {
  try {
    const guildId = interaction.guild?.id;
    if (!guildId) return;

    // Example: fast /flags command
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "flags") {
        let output = Object.entries(flaggedUsers).map(([id, count]) => `<@${id}> — ${count}`).join("\n") || "No users currently flagged.";
        return interaction.reply({ content: `🚩 Flagged Users\n\n${output}`, ephemeral: true });
      }
      // Add more commands here...
    }

    // Example: button/select menu handling
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
      await interaction.deferUpdate();
      // handle buttons/menus
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: "❌ An error occurred.", ephemeral: true });
    else if (interaction.deferred) await interaction.editReply({ content: "❌ An error occurred." });
    else await interaction.followUp({ content: "❌ An error occurred.", ephemeral: true });
  }
});

// ----------------------------
// Login
client.login(process.env.DISCORDAPP_TOKEN);