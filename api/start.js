import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

let botStarted = false;
let client;

export default async function handler(req, res) {
  const { token } = req.query;

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
      try {
        await interaction.deferReply();
        await interaction.editReply('You’ve used an application command! ✅ You now qualify for the Active Developer Badge.');
      } catch (err) {
        console.error('Interaction error:', err);
      }
    }
  });

  try {
    await client.login(token);

    const rest = new REST({ version: '10' }).setToken(token);
    const app = await client.application.fetch();
    const command = new SlashCommandBuilder()
      .setName('active')
      .setDescription('Get the Active Developer Badge');

    await rest.put(Routes.applicationCommands(app.id), {
      body: [command.toJSON()],
    });

    console.log('✅ Slash command registered');

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
}
