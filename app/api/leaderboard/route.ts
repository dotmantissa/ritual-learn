import { NextResponse } from 'next/server';

const BIN_ID = process.env.JSONBIN_BIN_ID;
const API_KEY = process.env.JSONBIN_KEY;

// Securely LOAD the leaderboard
export async function GET() {
  if (!BIN_ID || !API_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' },
      next: { revalidate: 0 } // Prevent caching stale leaderboards
    });
    
    if (!res.ok) throw new Error('Failed to fetch from JSONBin');
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}

// Securely SAVE a new score
export async function POST(request: Request) {
  // Silent security check to block unauthorized direct POST requests
  const auth = request.headers.get('X-Ritual-Learn-Secret');
  if (auth !== 'PROTOCOL_SIGNAL_ACTIVE') {
    return NextResponse.json({ error: 'Unauthorized origin' }, { status: 401 });
  }

  if (!BIN_ID || !API_KEY) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    const { name, score, tier, date } = await request.json();

    // 1. Fetch current scores
    const readRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
    });
    const data = await readRes.json();
    let scores = data?.record?.scores || data?.scores || [];

    // 2. Process and validate the new score
    const entry = { name, score, tier, date };
    const idx = scores.findIndex((s: any) => s.name.toLowerCase() === name.toLowerCase());
    
    if (idx >= 0) {
      if (score > scores[idx].score) scores[idx] = entry; // Only update if score is higher
    } else {
      scores.push(entry);
    }

    // 3. Sort and keep top 50
    scores.sort((a: any, b: any) => b.score - a.score);
    scores = scores.slice(0, 50);

    // 4. Save back to JSONBin securely
    await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body: JSON.stringify({ scores })
    });

    return NextResponse.json({ scores });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Score settlement failed' }, { status: 500 });
  }
}
