import { NextResponse } from 'next/server';

// These secrets must be added to your Vercel project environment variables
const BIN_ID = process.env.JSONBIN_BIN_ID;
const MASTER_KEY = process.env.JSONBIN_KEY;

// SECURELY FETCH THE LEADERBOARD
export async function GET() {
  if (!BIN_ID || !MASTER_KEY) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Meta': 'false'
      },
    });

    if (!res.ok) throw new Error('Jsonbin read failed.');

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard.' }, { status: 500 });
  }
}

// SECURELY UPDATE THE LEADERBOARD
export async function POST(request: Request) {
  if (!BIN_ID || !MASTER_KEY) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const newEntry = await request.json();

    // 1. Fetch current scores securely
    const readRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
      headers: {
        'X-Master-Key': MASTER_KEY,
        'X-Bin-Meta': 'false'
      },
    });

    const data = await readRes.json();
    let currentScores = data?.record?.scores || [];

    // 2. Perform merge logic server-side
    const idx = currentScores.findIndex((s: any) => s.name.toLowerCase() === newEntry.name.toLowerCase());
    
    if (idx >= 0) {
      if (newEntry.score > currentScores[idx].score) {
        currentScores[idx] = newEntry; // Update if the score is higher
      }
    } else {
      currentScores.push(newEntry);
    }

    // 3. Sort and cap top 50
    currentScores.sort((a: any, b: any) => b.score - a.score);
    const topScores = currentScores.slice(0, 50);

    // 4. Write back to Jsonbin securely
    const writeRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': MASTER_KEY
      },
      body: JSON.stringify({ scores: topScores })
    });

    if (!writeRes.ok) throw new Error('Jsonbin write failed.');

    return NextResponse.json({ scores: topScores });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save score.' }, { status: 500 });
  }
}
