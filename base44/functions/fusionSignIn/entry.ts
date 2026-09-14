import { secrets } from 'base44:runtime';
import { normalizeFusionMobile } from '../../shared/fusionMobileFormat.ts';

// Proxy for the fusion onQ signin API. Called from the ICE onQ sign-in flow
// when a detected fusion user has a password set.
//
// POST https://app.fusiononq.com/api/
//   header: apiKey
//   form body: countryCode=27&identifier=0720980200&password=...&action=signin
//
// Returns the fusion response verbatim:
//   { result: false, reason: 'Invalid password' }
//   { result: true, reason: '...', user: { ... } }

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId: identifier, countryCode } = normalizeFusionMobile(body.mobile);
    if (!identifier || !body.password) {
      return Response.json({ error: 'mobile and password required' }, { status: 400 });
    }

    const form = new URLSearchParams({
      countryCode,
      identifier,
      password: String(body.password),
      action: 'signin',
    });

    const res = await fetch('https://app.fusiononq.com/api/', {
      method: 'POST',
      headers: {
        'apiKey': secrets.get('FUSION_API_KEY'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await res.json().catch(() => null);
    if (data === null) {
      return Response.json({ error: 'Invalid response from fusion onQ' }, { status: 502 });
    }
    return Response.json(data);
  } catch (error) {
    console.error('[fusionSignIn]', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});