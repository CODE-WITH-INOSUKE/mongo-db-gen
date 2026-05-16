const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createAll } = require("../functions/createDb");
const config = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gen')
    .setDescription('Generate a MongoDB')
    .toJSON(),
  async execute(interaction) {
    const user = interaction.user;
    const random_username = Math.random().toString(36).substring(7);
    const random_password = Math.random().toString(36).substring(7);

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
        random_username,
        authToken,
        public_key,
        ipWhitelist,
        random_username,
        random_password
      );

      embed.setDescription(`**Here is your database:** ${mongo}`);
      user.send({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      user.send("There was an error while creating your MongoDB. Please try again.");
    }
  },
};
