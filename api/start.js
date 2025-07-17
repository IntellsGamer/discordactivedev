// api/start.js
import { startBot } from '../bot/runner.js';

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Missing token');
  }

  try {
    await startBot(token);
    res.status(200).send('Bot started and slash command registered!');
  } catch (e) {
    console.error('Failed to start bot:', e);
    res.status(500).send('Error starting bot.');
  }
}
