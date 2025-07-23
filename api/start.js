import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const blockedIPs = new Map(); // ip => unblock timestamp (ms)

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

let client = null;
let shutdownAt = null; // store the future shutdown time

export default async function handler(req, res) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const now = Date.now();

    const blockedIPList = [
        // Original
        '51.195.190.34', '15.204.76.66', '135.148.55.133', '62.146.239.253',
        '94.242.50.8', '51.158.253.109', '62.210.95.155', '51.158.252.47',

        // VPN services - OVH / Hetzner / Leaseweb / DigitalOcean / AWS
        '141.94.254.123', '141.95.0.117', '142.44.240.10', '147.135.10.68', '51.68.173.173',
        '15.204.76.202', '3.21.150.100', '13.58.225.57', '18.219.21.33', '15.204.80.212',
        '138.199.31.76', '159.69.73.136', '5.9.147.234', '65.109.108.253', '89.58.59.23',
        '152.89.163.220', '143.198.76.94', '143.198.92.50', '64.227.67.176', '68.183.189.97',

        // NordVPN (known endpoints)
        '185.168.112.5', '185.168.112.6', '185.168.112.7', '185.168.112.8', '185.168.112.9',
        '185.169.52.6', '185.169.52.7', '185.169.52.8', '185.169.52.9', '185.169.52.10',

        // Mullvad
        '185.65.135.1', '185.65.134.1', '194.126.177.66', '193.32.127.66', '185.167.72.66',

        // ProtonVPN
        '185.159.157.1', '185.159.158.1', '185.159.159.1', '185.159.160.1', '185.159.161.1',

        // Mysterious datacenter VPNs
        '45.146.164.123', '89.187.169.199', '89.187.169.200', '89.187.169.201', '89.187.169.202',
        '38.132.108.1', '38.132.108.2', '38.132.108.3', '38.132.108.4', '38.132.108.5',

        // AbuseIPDB top proxies (frequently reported)
        '45.61.187.67', '154.85.1.217', '103.225.76.40', '185.220.101.1', '45.14.149.1',
        '103.28.52.1', '102.129.153.66', '102.129.153.67', '102.129.153.68', '102.129.153.69',
        '146.70.183.1', '146.70.183.2', '146.70.183.3', '146.70.183.4', '146.70.183.5',

        // Public proxy services / spam sources
        '91.243.11.50', '91.243.11.51', '91.243.11.52', '91.243.11.53', '91.243.11.54',
        '103.75.201.2', '103.75.201.3', '103.75.201.4', '103.75.201.5', '103.75.201.6',

        // NoPing / Tunnelbear / Windscribe
        '191.96.236.123', '191.96.236.124', '191.96.236.125', '191.96.236.126', '191.96.236.127',
        '45.79.18.197', '45.79.18.198', '45.79.18.199', '45.79.18.200', '45.79.18.201',

        // Tor exit nodes (sample)
        '185.220.100.253', '185.220.100.254', '185.220.101.1', '185.220.101.2', '185.220.101.3',
        '171.25.193.78', '171.25.193.20', '199.249.230.69', '204.13.164.118', '204.13.164.119',

        // Cloud hosting used by proxies
        '104.248.54.174', '134.209.101.145', '157.245.6.251', '68.183.135.165', '157.245.43.116',
        '134.122.101.155', '134.122.15.59', '206.189.205.129', '174.138.10.145', '206.189.192.131',

        // Residential proxy networks
        '102.130.122.42', '102.130.122.43', '102.130.122.44', '102.130.122.45', '102.130.122.46',

        // More shady OVH/Dedibox IPs
        '51.222.253.9', '51.222.253.10', '51.222.253.11', '51.222.253.12', '51.222.253.13',
        '158.69.31.12', '158.69.31.13', '158.69.31.14', '158.69.31.15', '158.69.31.16',

        // Random bot activity IPs observed on honeypots
        '194.61.24.10', '185.17.0.199', '23.254.227.77', '23.254.227.78', '23.254.227.79',
        '95.181.152.3', '95.181.152.4', '95.181.152.5', '95.181.152.6', '95.181.152.7',

        // Flood proxies used in join raids
        '45.155.205.122', '45.155.205.123', '45.155.205.124', '45.155.205.125', '45.155.205.126',

        // Just in case: localhost / RFC1918 / common spoof
        '127.0.0.1', '0.0.0.0', '192.168.1.1', '10.0.0.1', '172.16.0.1',

        // Publicly abused Korean VPNs
        '222.239.10.10', '222.239.10.11', '222.239.10.12', '222.239.10.13', '222.239.10.14',

        // Spoofing known AWS gateways
        '3.8.8.8', '3.9.9.9', '3.10.10.10', '3.11.11.11', '3.12.12.12',

        // More Tor Exit (again)
        '89.234.157.254', '89.234.157.253', '89.234.157.252', '89.234.157.251', '89.234.157.250',

        // Final chunk from free proxy lists
        '103.75.200.1', '103.75.200.2', '103.75.200.3', '103.75.200.4', '103.75.200.5'
    ];

    const moreBlockedIPs = [
        // Extended NordVPN endpoints
        '89.187.171.34', '89.187.171.35', '89.187.171.36', '89.187.171.37', '89.187.171.38',
        '194.26.29.90', '194.26.29.91', '194.26.29.92', '194.26.29.93', '194.26.29.94',

        // Extended ProtonVPN pool
        '185.159.161.2', '185.159.161.3', '185.159.161.4', '185.159.161.5', '185.159.161.6',

        // More Mullvad IPs
        '185.65.135.2', '185.65.135.3', '185.65.135.4', '185.65.135.5', '185.65.135.6',

        // OVH / Hetzner proxies
        '51.210.0.12', '51.210.0.13', '51.210.0.14', '51.210.0.15', '51.210.0.16',
        '5.39.218.102', '5.39.218.103', '5.39.218.104', '5.39.218.105', '5.39.218.106',

        // US-based hosting abuse proxies
        '147.139.192.11', '147.139.192.12', '147.139.192.13', '147.139.192.14', '147.139.192.15',
        '157.245.6.252', '157.245.6.253', '157.245.6.254', '157.245.6.255', '157.245.7.0',

        // Residential proxy pool IPs
        '45.227.254.1', '45.227.254.2', '45.227.254.3', '45.227.254.4', '45.227.254.5',
        '185.246.208.10', '185.246.208.11', '185.246.208.12', '185.246.208.13', '185.246.208.14',

        // Suspected scraper / bot hosts (known ranges)
        '65.49.20.66', '65.49.20.67', '65.49.20.68', '65.49.20.69', '65.49.20.70',
        '195.123.237.94', '195.123.237.95', '195.123.237.96', '195.123.237.97', '195.123.237.98',

        // Datacenter proxies - misc
        '212.102.33.106', '212.102.33.107', '212.102.33.108', '212.102.33.109', '212.102.33.110',
        '138.201.223.1', '138.201.223.2', '138.201.223.3', '138.201.223.4', '138.201.223.5',

        // More Tor relays (exit nodes)
        '154.16.57.231', '154.16.57.232', '154.16.57.233', '154.16.57.234', '154.16.57.235',
        '171.25.193.235', '171.25.193.236', '171.25.193.237', '171.25.193.238', '171.25.193.239',

        // Recently flagged in honeypots / Discord joinbots
        '185.117.73.110', '185.117.73.111', '185.117.73.112', '185.117.73.113', '185.117.73.114',
        '144.76.18.233', '144.76.18.234', '144.76.18.235', '144.76.18.236', '144.76.18.237',

        // IPv6-mapped NAT64 public proxies (v4-style)
        '64.225.100.75', '64.225.100.76', '64.225.100.77', '64.225.100.78', '64.225.100.79',
        '45.63.107.1', '45.63.107.2', '45.63.107.3', '45.63.107.4', '45.63.107.5',

        // Misc shared proxy gateways
        '104.168.130.22', '104.168.130.23', '104.168.130.24', '104.168.130.25', '104.168.130.26',

        // Russian proxies / DC IPs
        '91.215.85.1', '91.215.85.2', '91.215.85.3', '91.215.85.4', '91.215.85.5',
        '194.58.112.174', '194.58.112.175', '194.58.112.176', '194.58.112.177', '194.58.112.178',

        // Fake residential VPNs
        '102.68.128.2', '102.68.128.3', '102.68.128.4', '102.68.128.5', '102.68.128.6',

        // Known Windscribe IPs
        '104.200.131.2', '104.200.131.3', '104.200.131.4', '104.200.131.5', '104.200.131.6',

        // More shady DC blocks
        '103.152.112.45', '103.152.112.46', '103.152.112.47', '103.152.112.48', '103.152.112.49',

        // Publicly abused Indian proxies
        '103.86.49.1', '103.86.49.2', '103.86.49.3', '103.86.49.4', '103.86.49.5',

        // More mass-joiners / scraper IPs
        '185.207.204.1', '185.207.204.2', '185.207.204.3', '185.207.204.4', '185.207.204.5',

        // Fake browsers / spoofers observed
        '94.103.95.100', '94.103.95.101', '94.103.95.102', '94.103.95.103', '94.103.95.104'
    ];


    if (blockedIPList.includes(ip) || moreBlockedIPs.includes(ip)) {
        return res.status(403).send("VPN or Proxy detected. Please disable it to continue.");
    }

    const token = req.query.token || process.env.DISCORD_TOKEN;
    if (!token) return res.status(400).send('Missing token');

    if (client && client.isReady()) {
        const msLeft = shutdownAt - Date.now();
        const minLeft = Math.ceil(msLeft / 60000);
        let timeLeftStr = ``;
        if (shutdownAt) {
            timeLeftStr = ` Please wait ~${minLeft} minute(s).`
        }
        return res.status(200).send(`Bot already running.${timeLeftStr}`);
    }

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

    client = new Client({ intents: [GatewayIntentBits.Guilds] });

    // Add interaction listener ONCE
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

    client.once('ready', async () => {
        console.log(`🤖 Logged in as ${client.user.tag} (token: ${token.substring(0, 8)}...)`);

        try {
            await client.application.fetch();

            const rest = new REST({ version: '10' }).setToken(token);
            const command = new SlashCommandBuilder()
                .setName('active')
                .setDescription('Get the Active Developer Badge');

            await rest.put(Routes.applicationCommands(client.application.id), {
                body: [command.toJSON()],
            });

            console.log('✅ Slash command registered');
        } catch (error) {
            console.error('Failed to register commands:', error);
        }
    });

    try {
        await client.login(token).catch(err => {
            console.error('Login error:', err);
            throw err; // rethrow for outer catch
        });

        // Block IP immediately after starting the bot
        blockedIPs.set(ip, now + COOLDOWN_MS);

        const lifetime = 5 * 60 * 1000; // 5 minutes
        shutdownAt = Date.now() + lifetime;

        setTimeout(() => {
            client.destroy();
            client = null;
            shutdownAt = null;
            console.log(`⌛ Bot stopped (token: ${token.substring(0, 8)}...)`);
        }, lifetime);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`⌛ Bot is running for 5 minutes...
💡 To use it, run in Discord: /active
✅ You might have to refresh Discord to see the command.
⚠️ NOTE: Make sure you have the "Use data to improve Discord" setting enabled under User Settings &gt; Privacy & Safety otherwise you won't be able to be marked as eligible.
`);
    } catch (error) {
        res.status(500).send('Failed to start bot. Check token and try again.');
    }
}