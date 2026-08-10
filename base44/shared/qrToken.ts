// Generates a cryptographically random, URL-safe token.
// Default length is 32 chars (high-entropy) — used for the founding ICE QR code.
export function generateQrToken(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

// Extracts a 32-char token from either a raw token or a full URL like
// https://ice.onq.life/{token}
export function normalizeQrToken(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  // Try to extract from a URL path
  const match = trimmed.match(/\/([A-Za-z0-9_-]{32})(?:[/?#]|$)/);
  if (match) return match[1];
  // Otherwise treat as a raw token
  if (/^[A-Za-z0-9_-]{32}$/.test(trimmed)) return trimmed;
  return null;
}