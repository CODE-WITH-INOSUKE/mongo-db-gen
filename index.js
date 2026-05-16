const { Client, GatewayIntentBits, REST, Routes, Events, MessageFlags } = require("discord.js");
const fs = require('fs');
const { join } = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Map();

const config = require("./config.json");

if (!config.token)
  throw new Error("Please enter a token in config.json ");
if (!config.private_key)
  throw new Error("Please enter a private key in the config.json");
if (!config.public_key)
  throw new Error("Please enter a public key in the config.json");
if (!config.org_Id)
  throw new Error("Please enter an orgId in the config.json");

const commands = [];
const commandFiles = fs.readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(join(__dirname, 'commands', file));
  commands.push(command.data);
  client.commands.set(command.data.name, command);
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands globally.');
  } catch (error) {
    console.error(error);
  }
})();

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}!`);
  readyClient.user.setStatus('online');
  readyClient.user.setActivity('Ghost Planet');
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
    }
  }
});

client.login(config.token);
