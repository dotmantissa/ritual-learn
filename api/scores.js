export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || '';
  if (allowed && origin && !origin.includes(allowed)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const KEY = process.env.JSONBIN_KEY;
  const BIN = process.env.JSONBIN_BIN_ID;

  if (!KEY || !BIN) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const BASE = `https://api.jsonbin.io/v3/b/${BIN}`;
  const hdrs = { 'X-Master-Key': KEY, 'X-Bin-Meta': 'false', 'Content-Type': 'application/json' };

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${BASE}/latest`, { headers: hdrs });
      if (!r.ok) return res.status(r.status).json({ error: 'Read failed' });
      const d = await r.json();
      return res.status(200).json(d.record ?? d);
    }

    if (req.method === 'POST') {
      const { name, score, tier, date } = req.body;
      if (
        typeof name !== 'string' || name.trim().length < 1 || name.length > 60 ||
        typeof score !== 'number' || score < 0 || score > 20 ||
        typeof tier !== 'string' || tier.length > 60
      ) {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      const readRes = await fetch(`${BASE}/latest`, { headers: hdrs });
      if (!readRes.ok) return res.status(readRes.status).json({ error: 'Read failed' });
      const existing = (await readRes.json()).record?.scores ?? [];

      const entry = { name: name.trim(), score, tier, date: date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
      const map = {};
      [...existing, entry].forEach(s => {
        const k = s.name.toLowerCase();
        if (!map[k] || s.score > map[k].score) map[k] = s;
      });
      const merged = Object.values(map).sort((a, b) => b.score - a.score).slice(0, 50);

      const writeRes = await fetch(BASE, { method: 'PUT', headers: hdrs, body: JSON.stringify({ scores: merged }) });
      if (!writeRes.ok) return res.status(writeRes.status).json({ error: 'Write failed' });

      return res.status(200).json({ ok: true, scores: merged });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/scores]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
