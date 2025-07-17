import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

let client;

export default async function handler(req, res) {
const token = req.query.token || process.env.DISCORD_TOKEN;
if (!token) return res.status(400).send('Missing token');

if (client && client.isReady()) {
return res.status(200).send('Bot already running.');
}

client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === 'active') {
try {
await interaction.deferReply();
        await interaction.editReply(
          "✅ You’ve used an application command!\n\n" +
          "To claim your **Active Developer Badge**, follow these steps:\n" +
          "1. Visit **https://discord.com/developers/active-developer**.\n" +
          "2. Select your application (the bot that just responded).\n" +
          "3. Click **Claim Badge**.\n\n" +
          "🔁 If you lose the badge due to inactivity, just use another command and revisit that page.\n" +
          "🕒 You typically have to wait **up to 24 hours** after using a command before claiming the badge."
        );

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

// Keep the connection alive for ~10 seconds before closing
setTimeout(() => {
console.log('⌛ Bot shutting down after 60 seconds.');
client.destroy();
res.end('Bot stopped after 60 seconds.');
}, 60000);

} catch (error) {
console.error(error);
res.status(500).send('Failed to start bot.');
}
}
