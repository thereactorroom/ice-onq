import { secrets } from 'base44:runtime';
import { normalizeFusionMobile } from '../../shared/fusionMobileFormat.ts';

// Proxy for the fusion onQ sendOTP API. Called from the ICE onQ sign-in flow
// when the detected fusion user has no password set (hasPassword = false).
//
// POST https://app.fusiononq.com/api/
//   header: apiKey
//   form body: mobile=<local mobile>&countryCode=27&action=sendOTP
//
// fusion onQ limits OTP sends to 3 per mobile number in a 24-hour period.
//   { result: false, reason: "You've reached your daily OTP limit. Please try again in 24 hours." }
//   { result: true, reason: "OTP has been sent." }

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId: localMobile, countryCode } = normalizeFusionMobile(body.mobile);
    if (!localMobile) return Response.json({ error: 'mobile required' }, { status: 400 });

    const form = new URLSearchParams({ mobile: localMobile, countryCode, action: 'sendOTP' });

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
    console.error('[fusionSendOtp]', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});