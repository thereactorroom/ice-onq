// Fusion onQ local mobile format — shared by fusionUserCheck and fusionSignIn.
// Splits a raw mobile number into the local userId (leading 0 kept) and the
// country code expected by the fusion API.
//   +27720980200 → { userId: '0720980200', countryCode: '27' }
//   27720980200  → { userId: '0720980200', countryCode: '27' }
//   0720980200   → { userId: '0720980200', countryCode: '27' }
export function normalizeFusionMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const countryCode = '27';
  if (digits.startsWith('0')) return { userId: digits, countryCode };
  if (digits.startsWith('27') && digits.length === 11) return { userId: '0' + digits.slice(2), countryCode };
  if (digits.length === 9) return { userId: '0' + digits, countryCode };
  return { userId: digits, countryCode };
}