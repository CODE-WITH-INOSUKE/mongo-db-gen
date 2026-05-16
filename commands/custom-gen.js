const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createAll } = require("../functions/createDb");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('custom-gen')
    .setDescription('Generate a MongoDB')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your desired username for the MongoDB')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('password')
        .setDescription('Your desired password for the MongoDB')
        .setRequired(true))
    .toJSON(),
  async execute(interaction) {
    const user = interaction.user;
    const username = interaction.options.getString('username');
    const password = interaction.options.getString('password');

    await interaction.reply("Check your DMs ;)");

    const embed = new EmbedBuilder()
      .setTitle("MongoDB URL Generator")
      .setColor(0x00FF00)
      .setFooter({
        text: "Made By Ghost Planet",
        iconURL: interaction.client.user.avatarURL(),
      });

    const authToken = config.private_key;
    const public_key = config.public_key;
    const ipWhitelist = "0.0.0.0";

    user.send("Creating your MongoDB. This may take some time...");

    let mongo;
    try {
      mongo = await createAll(
        username,
        authToken,
        public_key,
        ipWhitelist,
        username,
        password
      );

      embed.setDescription(`**Here is your database:** ${mongo}`);
      user.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      user.send("There was an error while creating your MongoDB. Please try again.");
    }
  },
};
