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
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CHAPPY_MENTION = process.env.CHAPPY_MENTION; // e.g. <@1467185317433049244>
const CHAPPY_AUTHOR_ID = process.env.CHAPPY_AUTHOR_ID; // e.g. 1467185317433049244
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const VOICEVOX_URL = process.env.VOICEVOX_URL || 'http://127.0.0.1:50021';
const VOICEVOX_SPEAKER = process.env.VOICEVOX_SPEAKER ? Number(process.env.VOICEVOX_SPEAKER) : 1; // 1=ずんだもん(あまあま)

function requireEnv(name, val) {
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

async function discordSend(channelId, content) {
  // Prefer webhook for sending, so messages are not authored by a bot account.
  if (DISCORD_WEBHOOK_URL) {
    // Use wait=true to get the created message object (including id)
    const url = DISCORD_WEBHOOK_URL.includes('?')
      ? `${DISCORD_WEBHOOK_URL}&wait=true`
      : `${DISCORD_WEBHOOK_URL}?wait=true`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Discord webhook send failed: ${res.status} ${res.statusText} ${text}`);
    }

    const msg = await res.json().catch(() => null);
    if (!msg?.id) throw new Error('Discord webhook send: missing message id');
    return msg;
  }

  // Fallback: bot token send (not recommended; may be ignored by other bots)
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

    // Default to the canonical prefix so Chappy can route/trigger reliably
    const prefix = req.body?.prefix ? String(req.body.prefix) : 'voiceclaw: ';
    const mention = CHAPPY_MENTION ? (CHAPPY_MENTION.trim() + ' ') : '';
    const sent = await discordSend(channelId, mention + prefix + text);

    const sentAuthorId = sent?.author?.id;
    res.json({ ok: true, sentId: sent.id, sentAuthorId, via: DISCORD_WEBHOOK_URL ? 'webhook' : 'bot' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// GET /api/wait-reply?afterId=...&timeoutMs=45000&excludeAuthorId=...
app.get('/api/wait-reply', async (req, res) => {
  try {
    const channelId = req.query.channelId || DISCORD_CHANNEL_ID;
    requireEnv('DISCORD_CHANNEL_ID', channelId);

    const afterId = String(req.query.afterId || '').trim();
    if (!afterId) return res.status(400).json({ ok: false, error: 'afterId required' });

    const excludeAuthorId = String(req.query.excludeAuthorId || '').trim();

    const timeoutMs = req.query.timeoutMs ? Number(req.query.timeoutMs) : 45000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const msgs = await discordGetLatest(channelId, 30);
      const newer = msgs.filter((m) => {
        try {
          return BigInt(m.id) > BigInt(afterId);
        } catch {
          return false;
        }
      });

      const candidate = newer.find((m) => {
        if (!m?.content) return false;
        if (excludeAuthorId && m?.author?.id === excludeAuthorId) return false;

        // Prefer replies from Chappy only (prevents picking up other human messages)
        if (CHAPPY_AUTHOR_ID) return m?.author?.id === CHAPPY_AUTHOR_ID;

        // Fallback: only accept bot-authored messages (still better than humans)
        return m?.author?.bot === true;
      });

      if (candidate) {
        return res.json({
          ok: true,
          message: {
            id: candidate.id,
            content: candidate.content,
            author: candidate.author?.username,
            authorId: candidate.author?.id,
            bot: candidate.author?.bot,
          },
        });
      }

      await new Promise((r) => setTimeout(r, 1200));
    }

    res.status(504).json({ ok: false, error: 'timeout waiting for reply' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// POST /api/tts { text } → VOICEVOX → WAV audio
app.post('/api/tts', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });

    const speakerId = req.body?.speaker ?? VOICEVOX_SPEAKER;

    // Step 1: audio_query
    const queryRes = await fetch(
      `${VOICEVOX_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      { method: 'POST' }
    );
    if (!queryRes.ok) throw new Error(`VOICEVOX audio_query failed: ${queryRes.status}`);
    const query = await queryRes.json();

    // Step 2: synthesis
    const synthRes = await fetch(
      `${VOICEVOX_URL}/synthesis?speaker=${speakerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      }
    );
    if (!synthRes.ok) throw new Error(`VOICEVOX synthesis failed: ${synthRes.status}`);

    const wav = await synthRes.arrayBuffer();
    res.set('Content-Type', 'audio/wav');
    res.send(Buffer.from(wav));
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// POST /api/chat { text } → OpenClaw Gateway → { reply }
app.post('/api/chat', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'text required' });

    if (!OPENCLAW_GATEWAY_TOKEN) {
      return res.status(500).json({ ok: false, error: 'OPENCLAW_GATEWAY_TOKEN not set' });
    }

    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENCLAW_GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        user: 'voiceclaw',  // stable session key (persistent across requests)
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenClaw API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error('No reply from OpenClaw');

    res.json({ ok: true, reply });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[voiceclaw] listening on http://${HOST}:${PORT}`);
});
