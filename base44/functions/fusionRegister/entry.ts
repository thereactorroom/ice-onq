import { secrets } from 'base44:runtime';
import { normalizeFusionMobile } from '../../shared/fusionMobileFormat.ts';

// Proxy for the fusion onQ signup API. Called from the ICE onQ flows when a
// mobile number that is not yet registered with fusion onQ has been verified
// via an SMS one-time code.
//
// POST https://app.fusiononq.com/api/
//   header: apiKey
//   form body: name=Joe&surname=Soap&password=...&communityCode=&
//              mobile=0720000302&countryName=South+Africa&countryCode=27&action=signup
//
// Returns the fusion response verbatim:
//   { result: false, reason: '...' }
//   { result: true, reason: 'User registered successfully', user: { userId, name, surname, ... } }

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const surname = String(body.surname || '').trim();
    const password = String(body.password || '');
    const { userId: mobile, countryCode } = normalizeFusionMobile(body.mobile);
    if (!name || !surname || !password || !mobile) {
      return Response.json({ error: 'name, surname, password and mobile required' }, { status: 400 });
    }

    const form = new URLSearchParams({
      name,
      surname,
      password,
      communityCode: '',
      mobile,
      countryName: 'South Africa',
      countryCode,
      action: 'signup',
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
    console.error('[fusionRegister]', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});