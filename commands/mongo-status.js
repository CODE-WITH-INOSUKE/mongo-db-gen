const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { MongoClient } = require('mongodb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mongo-status')
    .setDescription('Check the status of a MongoDB')
    .addStringOption(option =>
      option.setName('mongo-url')
        .setDescription('MongoDB Connection URL')
        .setRequired(true))
    .toJSON(),
  async execute(interaction) {
    const mongoURL = interaction.options.getString('mongo-url');

    const expectedUrlStructure = /^(mongodb\+srv:\/\/)([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)@([a-zA-Z0-9.-]+)\/?(\?.*)?$/;

    if (!expectedUrlStructure.test(mongoURL)) {
      return interaction.reply({
        content: "Please make sure it is a valid MongoDB connection URL with the correct username and password.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = new MongoClient(mongoURL);

    try {
      await client.connect();
      await client.db().admin().ping();

      const onlineEmbed = new EmbedBuilder()
        .setTitle("MongoDB Status Checker")
        .setDescription(`The MongoDB at ${mongoURL} is online.`)
        .setColor(0x00FF00)
        .setFooter({
          text: "Made By Ghost Planet",
          iconURL: interaction.client.user.avatarURL(),
        });

      await interaction.editReply({ embeds: [onlineEmbed] });
    } catch (error) {
      const offlineEmbed = new EmbedBuilder()
        .setTitle("MongoDB Status Checker")
        .setDescription('MongoDB is offline.')
        .setColor(0xFF0000)
        .setFooter({
          text: "Made By Ghost Planet",
          iconURL: interaction.client.user.avatarURL(),
        });

      await interaction.editReply({ embeds: [offlineEmbed] });
    } finally {
      await client.close();
    }
  },
};
