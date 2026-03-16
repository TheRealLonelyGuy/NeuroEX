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
// Keep bot awake
const SELF_URL = "https://neuroex.onrender.com";
http.createServer((req, res) => res.end("NeuroEX bot running")).listen(process.env.PORT || 1000);

setInterval(async () => {
  try { await fetch(SELF_URL); console.log("Self ping successful"); } 
  catch { console.log("Self ping failed"); }
}, 4 * 60 * 1000);

// ----------------------------
// Storage
const flaggedUsers = {};
let serverConfig = fs.existsSync("./config.json") ? JSON.parse(fs.readFileSync("./config.json", "utf8")) : {};
function saveConfig() { fs.writeFileSync("./config.json", JSON.stringify(serverConfig, null, 2)); }

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

client.once("ready", () => console.log(`Bot online as ${client.user.tag}`));

// ----------------------------
// Link detection
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!/https?:\/\/[^\s]+/i.test(message.content)) return;

  const userId = message.author.id;
  flaggedUsers[userId] = (flaggedUsers[userId] || 0) + 1;
  console.log(`${message.author.tag} sent a link. Flags: ${flaggedUsers[userId]}`);

  if (flaggedUsers[userId] === 10) {
    try {
      const owner = await message.guild.fetchOwner();
      await owner.send(`🚨 Suspicious activity detected!\nUser <@${userId}> has sent 10 links.\nCurrent total: ${flaggedUsers[userId]}`);
    } catch (err) { console.error("Failed to notify server owner:", err); }
  }
});

// ----------------------------
// Interactions
client.on("interactionCreate", async interaction => {
  try {
    const guildId = interaction.guild?.id;
    if (!guildId) return;

    // ----------------------------
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const slowCommands = ["audit","kick","ban"];
      if (slowCommands.includes(interaction.commandName)) await interaction.deferReply({ ephemeral: true });

      // Block commands before setup
      if (interaction.commandName !== "setup" && (!serverConfig[guildId] || !serverConfig[guildId].setupComplete)) {
        return interaction.reply({ content: "⚠️ This server has not completed setup yet. Please run /setup first.", ephemeral: true });
      }

      const config = serverConfig[guildId];

      // Role permission check
      if (config?.accessRoles?.length && !interaction.member.roles.cache.some(r => config.accessRoles.includes(r.id))) {
        return interaction.reply({ content: "❌ You don't have permission to use this command.", ephemeral: true });
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
          .filter(r => r.name !== "@everyone")
          .slice(0, 25)
          .forEach(r => roleMenu.addOptions({ label: r.name, value: r.id }));

        const channelMenu = new ChannelSelectMenuBuilder()
          .setCustomId("setup_logs")
          .setPlaceholder("Select logs channel");

        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("setup_finish").setLabel("Finish").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("setup_cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          embeds: [embed],
          components: [
            new ActionRowBuilder().addComponents(roleMenu),
            new ActionRowBuilder().addComponents(channelMenu),
            buttonRow
          ],
          ephemeral: true
        });
      }

      // ----------------------------
      // /audit
      if (interaction.commandName === "audit") {
        const roles = interaction.guild.roles.cache;
        let score = 100, critical = [], high = [], moderate = [];

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
        let output = Object.entries(flaggedUsers).map(([id,count]) => `<@${id}> — ${count}`).join("\n");
        if (!output) output = "No users currently flagged.";
        if (slowCommands.includes(interaction.commandName)) return interaction.editReply({ content: `🚩 Flagged Users\n\n${output}` });
        return interaction.reply({ content: `🚩 Flagged Users\n\n${output}`, ephemeral: true });
      }

      // ----------------------------
      // /kick & /ban
      if (["kick","ban"].includes(interaction.commandName)) {
        const member = interaction.options.getMember("target");
        const reason = interaction.options.getString("reason") || "No reason";
        const perm = interaction.commandName === "kick" ? "KickMembers" : "BanMembers";
        const verb = interaction.commandName === "kick" ? "Kicked" : "Banned";

        if (!interaction.member.permissions.has(PermissionsBitField.Flags[perm]))
          return interaction.editReply({ content: `❌ You do not have permission to ${interaction.commandName}.` });
        if (!member)
          return interaction.editReply({ content: "❌ Member not found." });
        if (member.roles.highest.position >= interaction.member.roles.highest.position)
          return interaction.editReply({ content: `❌ Cannot ${interaction.commandName} a member with equal or higher role.` });

        if (interaction.commandName === "kick") await member.kick(reason);
        if (interaction.commandName === "ban") await member.ban({ reason });

        if (config?.logsChannel) {
          const logChannel = interaction.guild.channels.cache.get(config.logsChannel);
          if (logChannel) logChannel.send(`**${member.user.tag}** was ${verb.toLowerCase()} by **${interaction.user.tag}** | Reason: ${reason}`);
        }

        return interaction.editReply(`${verb} **${member.user.tag}**`);
      }
    }

    // ----------------------------
    // Buttons / Select Menus
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
      await interaction.deferUpdate();
      if (!serverConfig[guildId]) serverConfig[guildId] = { setupComplete:false, accessRoles:[], logsChannel:null };

      if (interaction.customId === "setup_roles") {
        serverConfig[guildId].accessRoles = interaction.values;
        saveConfig();
        return interaction.followUp({ content:"✅ Access roles saved.", ephemeral:true });
      }

      if (interaction.customId === "setup_logs") {
        serverConfig[guildId].logsChannel = interaction.values[0];
        saveConfig();
        return interaction.followUp({ content:"✅ Logs channel saved.", ephemeral:true });
      }

      if (interaction.customId === "setup_finish") {
        serverConfig[guildId].setupComplete = true;
        saveConfig();
        return interaction.editReply({ content:"✅ Setup complete!", embeds:[], components:[] });
      }

      if (interaction.customId === "setup_cancel") {
        serverConfig[guildId] = { setupComplete:false, accessRoles:[], logsChannel:null };
        saveConfig();
        return interaction.editReply({ content:"❌ Setup cancelled", embeds:[], components:[] });
      }
    }
  } catch (error) {
    console.error(error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ An error occurred.", ephemeral:true });
    } else if (interaction.deferred) {
      await interaction.editReply({ content:"❌ An error occurred." });
    }
  }
});

client.login(process.env.DISCORDAPP_TOKEN);