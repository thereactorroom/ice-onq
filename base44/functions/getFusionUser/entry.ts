import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { host, session } = await req.json();

    if (!host || !session) {
      return Response.json({ error: 'Missing host or session' }, { status: 400 });
    }

    // Step 1: fetch CSRF nonce (needed as API key for subsequent calls)
    const csrfRes = await fetch(`${host}/api/?action=csrf_nonce`, {
      headers: { session },
    });
    if (!csrfRes.ok) {
      return Response.json({ error: `CSRF nonce failed: ${csrfRes.status}` }, { status: 502 });
    }
    const apiKey = await csrfRes.text();

    // Step 2: fetch user
    const userRes = await fetch(`${host}/api/?action=getUser`, {
      headers: { Apikey: apiKey },
    });
    if (!userRes.ok) {
      return Response.json({ error: `getUser failed: ${userRes.status}` }, { status: 502 });
    }
    const user = await userRes.json();

    return Response.json({ user });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});