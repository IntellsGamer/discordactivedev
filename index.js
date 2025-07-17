import 'dotenv/config';  // loads environment variables from .env (Replit uses secrets)
import { startBot } from './runner.js';

const token = process.env.BOT_TOKEN;
const guildId = process.env.GUILD_ID; // optional, for testing

if (!token) {
  console.error('Missing BOT_TOKEN environment variable!');
  process.exit(1);
}

startBot(token, guildId).catch(console.error);
