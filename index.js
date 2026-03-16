require('dotenv').config();
const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fetch = require('node-fetch');
const http = require('http');

// ----------------------------
// Keep bot awake (Render)
const SELF_URL = "https://neuroex.onrender.com";

http.createServer((req, res) => {
  res.end("NeuroEX bot running");
}).listen(process.env.PORT || 1000);

setInterval(async () => {
  try {
    await fetch(SELF_URL);
    console.log("Self ping successful");
  } catch {
    console.log("Self ping failed");
  }
}, 4 * 60 * 1000);

// ----------------------------
// Storage
const flaggedUsers = {};
let serverConfig = {};

if (fs.existsSync("./config.json")) {
  serverConfig = JSON.parse(fs.readFileSync("./config.json", "utf8"));
}

function saveConfig() {
  fs.writeFileSync("./config.json", JSON.stringify(serverConfig, null, 2));
}

// ----------------------------
// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`Bot online as ${client.user.tag}`);
});

// ----------------------------
// Link detection
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  const urlPattern = /https?:\/\/[^\s]+/i;
  if (!urlPattern.test(message.content)) return;

  const userId = message.author.id;
  if (!flaggedUsers[userId]) flaggedUsers[userId] = 0;
  flaggedUsers[userId]++;

  console.log(`${message.author.tag} sent a link. Flags: ${flaggedUsers[userId]}`);

  if (flaggedUsers[userId] === 10) {
    try {
      const owner = await message.guild.fetchOwner();
      await owner.send(
        `🚨 Suspicious activity detected!\n` +
        `User <@${userId}> has sent 10 links in the server.\n` +
        `Current total: ${flaggedUsers[userId]}`
      );
    } catch (err) {
      console.error("Failed to notify server owner:", err);
    }
  }
});

// ----------------------------
// Slash commands & interactions
client.on("interactionCreate", async interaction => {
  try {
    const guildId = interaction.guild?.id;
    if (!guildId) return;

    // ----------------------------
    // Slash Commands
    if (interaction.isChatInputCommand()) {

      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });

      // Block commands before setup
      if (interaction.commandName !== "setup" &&
          (!serverConfig[guildId] || !serverConfig[guildId].setupComplete)) {
        return interaction.editReply({
          content: "⚠️ This server has not completed setup yet. Please run /setup first."
        });
      }

      const config = serverConfig[guildId];

      // Permission check based on roles
      if (config && config.accessRoles?.length > 0) {
        const hasRole = interaction.member.roles.cache.some(role =>
          config.accessRoles.includes(role.id)
        );
        if (!hasRole) {
          return interaction.editReply({ content: "❌ You don't have permission to use this command." });
        }
      }

      // ----------------------------
      // /audit
      if (interaction.commandName === "audit") {
        const roles = interaction.guild.roles.cache;
        let score = 100;
        let critical = [];
        let high = [];
        let moderate = [];

        roles.forEach(role => {
          if (role.permissions.has(PermissionsBitField.Flags.Administrator)) { critical.push(`Role **${role.name}** has Administrator!`); score -= 20; }
          if (role.permissions.has(PermissionsBitField.Flags.ManageRoles)) { high.push(`Role **${role.name}** can manage roles!`); score -= 15; }
          if (role.permissions.has(PermissionsBitField.Flags.BanMembers)) { high.push(`Role **${role.name}** can ban members!`); score -= 10; }
          if (role.permissions.has(PermissionsBitField.Flags.KickMembers)) { moderate.push(`Role **${role.name}** can kick members!`); score -= 10; }
          if (role.permissions.has(PermissionsBitField.Flags.MentionEveryone)) { moderate.push(`Role **${role.name}** can mention everyone!`); score -= 5; }
          if (role.permissions.has(PermissionsBitField.Flags.ManageMessages)) { moderate.push(`Role **${role.name}** can manage messages!`); score -= 10; }
          if (role.permissions.has(PermissionsBitField.Flags.ManageChannels)) { high.push(`Role **${role.name}** can manage channels!`); score -= 10; }
        });

        if (score < 0) score = 0;

        const embed = new EmbedBuilder()
          .setTitle("Server Security Audit")
          .setColor(score > 70 ? "Green" : score > 40 ? "Yellow" : "Red")
          .addFields(
            { name: "Score", value: `${score}/100` },
            { name: "🚨 Critical", value: critical.join("\n") || "None" },
            { name: "⚠️ High", value: high.join("\n") || "None" },
            { name: "⚠️ Moderate", value: moderate.join("\n") || "None" }
          )
          .setTimestamp()
          .setFooter({ text: `NeuroEX Corporation • ${interaction.guild.name}` });

        return interaction.editReply({ embeds: [embed] });
      }

      // ----------------------------
      // /flags
      if (interaction.commandName === "flags") {
        let output = Object.entries(flaggedUsers)
          .map(([id, count]) => `<@${id}> — ${count}`)
          .join("\n");
        if (!output) output = "No users currently flagged.";
        return interaction.editReply({ content: `🚩 Flagged Users\n\n${output}` });
      }

      // ----------------------------
      // /kick
      if (interaction.commandName === "kick") {
        const member = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason") || "No reason";

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers))
          return interaction.editReply({ content: "❌ You do not have permission to kick." });
        if (!member)
          return interaction.editReply({ content: "❌ Member not found." });
        if (member.roles.highest.position >= interaction.member.roles.highest.position)
          return interaction.editReply({ content: "❌ Cannot kick a member with equal or higher role." });

        await member.kick(reason);

        if (config?.logsChannel) {
          const logChannel = interaction.guild.channels.cache.get(config.logsChannel);
          if (logChannel) logChannel.send(`🦵 **${member.user.tag}** was kicked by **${interaction.user.tag}** | Reason: ${reason}`);
        }

        return interaction.editReply(`✅ Kicked **${member.user.tag}**`);
      }

      // ----------------------------
      // /ban
      if (interaction.commandName === "ban") {
        const member = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason") || "No reason";

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers))
          return interaction.editReply({ content: "❌ You do not have permission to ban." });
        if (!member)
          return interaction.editReply({ content: "❌ Member not found." });
        if (member.roles.highest.position >= interaction.member.roles.highest.position)
          return interaction.editReply({ content: "❌ Cannot ban a member with equal or higher role." });

        await member.ban({ reason });

        if (config?.logsChannel) {
          const logChannel = interaction.guild.channels.cache.get(config.logsChannel);
          if (logChannel) logChannel.send(`🔨 **${member.user.tag}** was banned by **${interaction.user.tag}** | Reason: ${reason}`);
        }

        return interaction.editReply(`🔨 Banned **${member.user.tag}**`);
      }

      // ----------------------------
      // /setup
      if (interaction.commandName === "setup") {
        const embed = new EmbedBuilder()
          .setTitle("NeuroEX Setup")
          .setDescription("Configure bot permissions.\n\nSelect roles and logs channel.")
          .setColor("Blue");

        const roleMenu = new StringSelectMenuBuilder()
          .setCustomId("setup_roles")
          .setPlaceholder("Select access roles")
          .setMinValues(1)
          .setMaxValues(5);

        interaction.guild.roles.cache
          .filter(role => role.name !== "@everyone")
          .first(25)
          .forEach(role => roleMenu.addOptions({ label: role.name, value: role.id }));

        const channelMenu = new ChannelSelectMenuBuilder()
          .setCustomId("setup_logs")
          .setPlaceholder("Select logs channel");

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("setup_finish").setLabel("Finish").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("setup_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(roleMenu),
            new ActionRowBuilder().addComponents(channelMenu),
            buttonRow
          ]
        });
      }
    }

    // ----------------------------
    // Button / Select Menu Interactions
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
      // deferUpdate prevents timeout
      await interaction.deferUpdate();

      if (!serverConfig[guildId]) serverConfig[guildId] = { setupComplete: false, accessRoles: [], logsChannel: null };

      if (interaction.customId === "setup_roles") {
        serverConfig[guildId].accessRoles = interaction.values;
        saveConfig();
        return interaction.followUp({ content: "✅ Access roles saved.", ephemeral: true });
      }

      if (interaction.customId === "setup_logs") {
        serverConfig[guildId].logsChannel = interaction.values[0];
        saveConfig();
        return interaction.followUp({ content: "✅ Logs channel saved.", ephemeral: true });
      }

      if (interaction.customId === "setup_finish") {
        serverConfig[guildId].setupComplete = true;
        saveConfig();
        return interaction.editReply({ content: "✅ Setup complete!", embeds: [], components: [] });
      }

      if (interaction.customId === "setup_cancel") {
        serverConfig[guildId] = { setupComplete: false, accessRoles: [], logsChannel: null };
        saveConfig();
        return interaction.editReply({ content: "❌ Setup cancelled", embeds: [], components: [] });
      }
    }

  } catch (error) {
    console.error(error);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ An error occurred while running the command.", ephemeral: true });
    }
  }
});

client.login(process.env.DISCORDAPP_TOKEN);