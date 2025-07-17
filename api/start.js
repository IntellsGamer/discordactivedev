const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

let botStarted = false;
let client;

module.exports = async (req, res) => {
  const { token, guildId } = req.query;

  if (!token) {
    return res.status(400).send('Missing token');
  }

  if (botStarted) {
    return res.status(200).send('Bot already running.');
  }

  botStarted = true;

  client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'active') {
      await interaction.reply('You’ve used an application command! ✅ You now qualify for the Active Developer Badge.');
    }
  });

  try {
    await client.login(token);

    // Wait for ready before registering
    await new Promise(resolve => client.once('ready', resolve));

    // Register command
    const rest = new REST({ version: '10' }).setToken(token);
    const app = await client.application.fetch();
    const command = new SlashCommandBuilder()
      .setName('active')
      .setDescription('Get the Active Developer Badge');

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(app.id, guildId), {
        body: [command.toJSON()],
      });
      console.log(`✅ Slash command registered in guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(app.id), {
        body: [command.toJSON()],
      });
      console.log('✅ Global slash command registered');
    }

    // Stop bot after 48 hours
    setTimeout(() => {
      console.log('⌛ Bot shutting down after 48h.');
      process.exit(0);
    }, 1000 * 60 * 60 * 48);

    res.status(200).send('Bot is running. Slash command registered.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to start bot.');
  }
};
