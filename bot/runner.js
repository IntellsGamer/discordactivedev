import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const RUNTIME_MS = 86400000; // 24 hours
let client;

export async function startBot(token, guildId) {
  if (!token) {
    console.error('Missing bot token');
    return;
  }

  client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'active') {
      try {
        await interaction.deferReply();
        await interaction.editReply("🏅 Congrats! You've used an application command. This qualifies you for the Active Developer Badge.");
      } catch (err) {
        console.error('❌ Error handling interaction:', err);
      }
    }
  });

  try {
    await client.login(token);
    await new Promise(resolve => client.once('ready', resolve));

    const rest = new REST({ version: '10' }).setToken(token);
    const command = new SlashCommandBuilder()
      .setName('active')
      .setDescription('Helps you qualify for the Active Developer Badge');

    const appData = await client.application.fetch();

    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(appData.id, guildId),
        { body: [command.toJSON()] }
      );
      console.log(`🛠️ Slash command registered in guild ${guildId}.`);
    } else {
      await rest.put(
        Routes.applicationCommands(appData.id),
        { body: [command.toJSON()] }
      );
      console.log('🛠️ Global slash command registered.');
    }

    console.log(`⏳ Bot is now listening for ${RUNTIME_MS / 1000} seconds...`);

    await new Promise(resolve => setTimeout(resolve, RUNTIME_MS));

    console.log('🛑 Shutting down bot after 24 hours.');
    await client.destroy();

  } catch (err) {
    console.error('❌ Failed to start bot:', err);
  }
}
