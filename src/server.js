import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json({ limit: '1mb' }));

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT ? Number(process.env.PORT) : 8788;
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

function requireEnv(name, val) {
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

async function discordSend(channelId, content) {
  const token = requireEnv('DISCORD_BOT_TOKEN', DISCORD_TOKEN);
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord send failed: ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

async function discordGetLatest(channelId, limit = 10) {
  const token = requireEnv('DISCORD_BOT_TOKEN', DISCORD_TOKEN);
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord fetch failed: ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

// Serve web UI
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// Serve index explicitly (avoids environment-specific static quirks)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Static assets (if we add any later)
app.use(express.static(publicDir));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// POST /api/send { text }
app.post('/api/send', async (req, res) => {
  try {
    const channelId = req.query.channelId || DISCORD_CHANNEL_ID;
    requireEnv('DISCORD_CHANNEL_ID', channelId);

    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });

    const prefix = req.body?.prefix ? String(req.body.prefix) : '';
    const sent = await discordSend(channelId, prefix + text);
    res.json({ ok: true, sentId: sent.id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// GET /api/wait-reply?afterId=...&timeoutMs=45000
app.get('/api/wait-reply', async (req, res) => {
  try {
    const channelId = req.query.channelId || DISCORD_CHANNEL_ID;
    requireEnv('DISCORD_CHANNEL_ID', channelId);

    const afterId = String(req.query.afterId || '').trim();
    if (!afterId) return res.status(400).json({ ok: false, error: 'afterId required' });

    const timeoutMs = req.query.timeoutMs ? Number(req.query.timeoutMs) : 45000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const msgs = await discordGetLatest(channelId, 10);
      const newer = msgs.filter((m) => {
        try {
          return BigInt(m.id) > BigInt(afterId);
        } catch {
          return false;
        }
      });

      const candidate = newer.find((m) => m?.content);
      if (candidate) {
        return res.json({ ok: true, message: { id: candidate.id, content: candidate.content, author: candidate.author?.username, bot: candidate.author?.bot } });
      }

      await new Promise((r) => setTimeout(r, 1200));
    }

    res.status(504).json({ ok: false, error: 'timeout waiting for reply' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[voiceclaw] listening on http://${HOST}:${PORT}`);
});
