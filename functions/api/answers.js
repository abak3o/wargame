// Simple receiver for submitted answers
// Note: This function echoes the received submission and attempts to read
// public/data/answers.json to include existing answers in the response.
// It does NOT persist data back to the repository (Cloudflare Functions/Workers
// cannot write to the deployed static files). To add persistence, implement a
// proper DB (D1) or external storage.

export async function onRequest(context) {
  const { request } = context;
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    // fetch existing answers (if any)
    const origin = new URL(request.url).origin;
    const answersUrl = new URL('/data/answers.json', origin).toString();
    let existing = [];
    try {
      const r = await fetch(answersUrl);
      if (r.ok) existing = await r.json();
    } catch (e) {
      // ignore, proceed with empty array
    }

    // create a new entry (we won't persist it)
    const newEntry = Object.assign({ id: Date.now(), received_at: new Date().toISOString() }, body);
    const merged = existing.concat([newEntry]);

    return new Response(JSON.stringify({ message: 'received', entry: newEntry, all: merged }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
}
