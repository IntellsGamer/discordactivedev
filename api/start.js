import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const clients = new Map(); // token => client instance
const blockedIPs = new Map(); // ip => unblock timestamp (ms)

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export default async function handler(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const now = Date.now();

    // Check IP cooldown
    if (blockedIPs.has(ip)) {
        const unblockTime = blockedIPs.get(ip);
        if (now < unblockTime) {
            const waitSec = Math.ceil((unblockTime - now) / 1000);
            const waitMinutes = Math.floor(waitSec / 60);
            return res.status(429).send(`Currently limited, please wait ${waitMinutes} minute${waitMinutes !== 1 ? 's' : ''}.`);
        } else {
            blockedIPs.delete(ip); // cooldown expired, remove from block list
        }
    }

    const token = req.query.token || process.env.DISCORD_TOKEN;
    if (!token) return res.status(400).send('Missing token');

    if (clients.has(token) && clients.get(token).isReady()) {
        return res.status(200).send('Bot already running for this token.');
    }

    const client = new Client({ intents: [GatewayIntentBits.Guilds] });
    clients.set(token, client);

    client.once('ready', () => {
        console.log(`🤖 Logged in as ${client.user.tag} (token: ${token.substring(0, 8)}...)`);
    });

    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'active') {
            try {
                await interaction.deferReply();
                await interaction.editReply(
                    "✅ You've used an application command!\n\n" +
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

        // Block IP immediately after starting the bot
        blockedIPs.set(ip, now + COOLDOWN_MS);

        setTimeout(() => {
            client.destroy();
            clients.delete(token);
            console.log(`⌛ Bot stopped for token ${token.substring(0, 8)}...`);
        }, 300000);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`
⌛ Bot is running for 5 minutes...
💡 To use it, run in Discord: /active
✅ You might have to refresh Discord to see the command.
⚠️ NOTE: Make sure you have the "Use data to improve Discord" setting enabled under User Settings &gt; Privacy & Safety otherwise you won't be able to be marked as eligible.
`);


    } catch (error) {
        clients.delete(token);
        console.error('Login error:', error);
        res.status(500).send('Failed to start bot. Check token and try again.');
    }
}
