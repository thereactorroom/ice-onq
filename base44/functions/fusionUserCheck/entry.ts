import { secrets } from 'base44:runtime';
import { normalizeFusionMobile } from '../../shared/fusionMobileFormat.ts';

// Proxy for the fusion onQ userCheck API. Called from the ICE onQ sign-in
// flow to verify a mobile number belongs to a fusion onQ user.
//
// POST https://app.fusiononq.com/api/
//   header: apiKey
//   form body: userId=<local mobile>&countryCode=27&action=userCheck
//
// Business rules (SA numbers):
//   +27720980200 → userId=0720980200, countryCode=27
//   27720980200  → userId=0720980200, countryCode=27
//   0720980200   → userId=0720980200, countryCode=27

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, countryCode } = normalizeFusionMobile(body.mobile);
    if (!userId) return Response.json({ error: 'mobile required' }, { status: 400 });

    const apiKey = secrets.get('FUSION_API_KEY');
    const form = new URLSearchParams({ userId, countryCode, action: 'userCheck' });

    const res = await fetch('https://app.fusiononq.com/api/', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
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
    console.error('[fusionUserCheck]', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});