export default async function handler(req, res) {
  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const API_KEY = process.env.JSONBIN_KEY;

  if (!BIN_ID || !API_KEY) {
    return res.status(500).json({ error: 'Server config error' });
  }

  // Handle Loading the Leaderboard
  if (req.method === 'GET') {
    try {
      const fetchRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
      });
      const data = await fetchRes.json();
      return res.status(200).json({ scores: data?.record?.scores || data?.scores || [] });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  // Handle Saving a New Score
  if (req.method === 'POST') {
    if (req.headers['x-ritual-secret'] !== 'PROTOCOL_ACTIVE') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      // Fetch current
      const readRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
      });
      const data = await readRes.json();
      let scores = data?.record?.scores || data?.scores || [];

      // Add new score (or overwrite if higher)
      const newEntry = req.body;
      const idx = scores.findIndex(s => s.name.toLowerCase() === newEntry.name.toLowerCase());
      
      if (idx >= 0) {
        if (newEntry.score > scores[idx].score) scores[idx] = newEntry;
      } else {
        scores.push(newEntry);
      }

      // Sort and keep top 50
      scores.sort((a, b) => b.score - a.score);
      scores = scores.slice(0, 50);

      // Save back to JSONBin
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
        body: JSON.stringify({ scores })
      });

      return res.status(200).json({ scores });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
