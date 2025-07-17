import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const EXPIRATION_MS = 1000 * 60 * 60 * 48; // 48 hours
const START_TIME = Date.now();

let client;

export async function startBot(token, guildId) {
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
      try {
        await interaction.deferReply();
        await interaction.editReply("Congrats! You've used an application command. That's enough for the Active Developer Badge. 🏅");
      } catch (err) {
        console.error('Error handling interaction:', err);
      }
    }
  });

  await client.login(token);

  await new Promise(resolve => client.once('ready', resolve));

  const rest = new REST({ version: '10' }).setToken(token);
  const command = new SlashCommandBuilder()
    .setName('active')
    .setDescription('Helps you qualify for the Active Developer Badge');

  try {
    const appData = await client.application.fetch();

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(appData.id, guildId),
        { body: [command.toJSON()] }
      );
      console.log(`Slash command registered in guild ${guildId}.`);
    } else {
      await rest.put(
        Routes.applicationCommands(appData.id),
        { body: [command.toJSON()] }
      );
      console.log('Global slash command registered.');
    }
  } catch (err) {
    console.error('Error registering command:', err);
  }
}
