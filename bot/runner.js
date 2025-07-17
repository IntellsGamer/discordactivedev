import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const EXPIRATION_MS = 1000 * 60 * 60 * 48; // 48 hours
const START_TIME = Date.now();

let client;

export async function startBot(token) {
  if (Date.now() > START_TIME + EXPIRATION_MS) {
    console.log('Bot expired.');
    return;
  }

  client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'active') {
      await interaction.reply('Congrats! You've used an application command. That's enough for the Active Developer Badge. 🏅');
    }
  });

  await client.login(token);

  // Register command
  const rest = new REST({ version: '10' }).setToken(token);
  const command = new SlashCommandBuilder()
    .setName('active')
    .setDescription('Helps you qualify for the Active Developer Badge');

  try {
    const appData = await client.application.fetch();
    await rest.put(Routes.applicationCommands(appData.id), {
      body: [command.toJSON()],
    });
    console.log('Slash command registered.');
  } catch (err) {
    console.error('Error registering command:', err);
  }
}

// === discordactivedev/api/start.js ===
import { startBot } from '../bot/runner.js';

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing token');
  }

  try {
    await startBot(token);
    res.status(200).send('Bot started and command registered!');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error starting bot.');
  }
}
