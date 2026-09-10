import { secrets } from "base44:runtime";

// ICE onQ QR Generator — binding-event callback endpoint.
// Pushes bind/unbind/transfer events so the QR generator app stays in sync
// with the bindings persisted in this app. Fire-and-forget with bounded retry.
const ENDPOINT = "https://ice-link-gen.base44.app/functions/fusionCallback";
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = 500;

// action: "bind" | "unbind" | "transfer"
// token: the QR token (normalized, 32 chars)
// profileId: the fusion profile id (fID) the code is bound to
export async function pushQrBindingEvent(action, token, profileId) {
  const sharedSecret = secrets.get("QR_GEN_CALLBACK_SECRET");
  if (!sharedSecret) {
    console.error("[qrGenCallback] Missing QR_GEN_CALLBACK_SECRET — skipping", action, token);
    return;
  }
  if (!token) {
    console.error("[qrGenCallback] Missing token — skipping", action);
    return;
  }

  const body = { shared_secret: sharedSecret, action, token, profile_id: profileId || "" };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Success — any 2xx
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        console.log(`[qrGenCallback] ${action} ok (attempt ${attempt}) token=${token} status=${data.status || "ok"}`);
        return;
      }

      // 401 / 404 — permanent config errors; do not retry, surface to logs.
      if (res.status === 401 || res.status === 404) {
        const data = await res.json().catch(() => ({}));
        console.error(`[qrGenCallback] ${action} permanent failure ${res.status} token=${token}:`, data.error || res.statusText);
        return;
      }

      // 4xx (other) — malformed/unknown action; do not retry.
      if (res.status >= 400 && res.status < 500) {
        const data = await res.json().catch(() => ({}));
        console.error(`[qrGenCallback] ${action} client error ${res.status} token=${token}:`, data.error || res.statusText);
        return;
      }

      // 5xx — retryable
      console.warn(`[qrGenCallback] ${action} ${res.status} (attempt ${attempt}) token=${token}`);
    } catch (err) {
      // Network error — retryable
      console.warn(`[qrGenCallback] ${action} network error (attempt ${attempt}) token=${token}:`, err?.message || err);
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
    }
  }

  console.error(`[qrGenCallback] ${action} gave up after ${MAX_ATTEMPTS} attempts token=${token}`);
}