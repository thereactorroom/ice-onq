import { secrets } from 'base44:runtime';

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

function normalizeMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const countryCode = '27';
  if (digits.startsWith('0')) return { userId: digits, countryCode };
  if (digits.startsWith('27') && digits.length === 11) return { userId: '0' + digits.slice(2), countryCode };
  if (digits.length === 9) return { userId: '0' + digits, countryCode };
  return { userId: digits, countryCode };
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, countryCode } = normalizeMobile(body.mobile);
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