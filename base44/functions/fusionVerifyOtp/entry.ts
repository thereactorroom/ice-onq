import { secrets } from 'base44:runtime';
import { normalizeMobile } from '../../shared/mobileNormalize.ts';

// Proxy for the fusion onQ verifyOTP API. Called from the ICE onQ sign-in flow
// to validate the SMS one-time code sent by fusionSendOtp.
//
// POST https://app.fusiononq.com/api/
//   header: apiKey
//   form body: userId=<E.164 mobile>&code=<otp>&signin=true&action=verifyOTP
//
//   { result: false, reason: 'Invalid OTP code' }
//   { result: true, reason: 'Valid OTP code', token: '...' }

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = normalizeMobile(body.mobile);
    const code = String(body.code || '').replace(/\D/g, '');
    if (!userId || !code) {
      return Response.json({ error: 'mobile and code required' }, { status: 400 });
    }

    // For fresh signups the caller passes signin=false — fusion's verifyOTP
    // endpoint must omit signin=true when the number isn't a fusion user yet.
    const signin = body.signin !== false;
    const form = new URLSearchParams({
      userId,
      code,
      action: 'verifyOTP',
    });
    if (signin) {
      form.set('signin', 'true');
    }

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
    console.error('[fusionVerifyOtp]', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});