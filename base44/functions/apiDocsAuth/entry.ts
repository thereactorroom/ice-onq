import { secrets } from "base44:runtime";
import { API_SPEC } from "../../shared/apiSpec.ts";

// Gate for the internal API documentation page.
// The spec itself lives in base44/shared/apiSpec.ts, so it never reaches the
// public client bundle: it is only returned here, after a correct login.
//
// Two credential sets are supported:
//   primary   — API_DOCS_USERNAME / API_DOCS_PASSWORD
//   secondary — API_DOCS_USERNAME_2 / API_DOCS_PASSWORD_2 (optional)
//
// Tokens are HMAC-signed per credential slot with that slot's password, so
// changing one password ends only that set's sessions.

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

async function sha256Hex(value) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signToken(expiry, slot, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const message = new TextEncoder().encode(`iceonq-docs:${expiry}:${slot}`);
  const sig = await crypto.subtle.sign("HMAC", key, message);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Every credential set that is fully configured, in slot order.
function credentialPairs() {
  const pairs = [];
  const user1 = secrets.get("API_DOCS_USERNAME");
  const pass1 = secrets.get("API_DOCS_PASSWORD");
  if (user1 && pass1) pairs.push({ username: user1, password: pass1 });
  const user2 = secrets.get("API_DOCS_USERNAME_2");
  const pass2 = secrets.get("API_DOCS_PASSWORD_2");
  if (user2 && pass2) pairs.push({ username: user2, password: pass2 });
  return pairs;
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const pairs = credentialPairs();
    if (pairs.length === 0) {
      return Response.json(
        {
          error:
            "API documentation access is not configured yet. Set API_DOCS_USERNAME and API_DOCS_PASSWORD.",
        },
        { status: 503 }
      );
    }

    if (action === "login") {
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!username || !password) {
        return Response.json({ error: "Username and password are required." }, { status: 400 });
      }

      let slot = -1;
      for (let i = 0; i < pairs.length; i += 1) {
        const userMatch = safeEqual(await sha256Hex(username), await sha256Hex(pairs[i].username));
        const passMatch = safeEqual(await sha256Hex(password), await sha256Hex(pairs[i].password));
        if (userMatch && passMatch) {
          slot = i;
          break;
        }
      }
      if (slot === -1) {
        return Response.json({ error: "Invalid username or password." }, { status: 401 });
      }

      const expiresAt = Date.now() + TOKEN_TTL_MS;
      const signature = await signToken(expiresAt, slot, pairs[slot].password);
      return Response.json({ token: `${expiresAt}.${slot}.${signature}`, expiresAt });
    }

    if (action === "spec") {
      const token = String(body.token || "");
      const parts = token.split(".");
      if (parts.length !== 3) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const expiry = Number(parts[0]);
      const slot = Number(parts[1]);
      if (!Number.isFinite(expiry) || expiry < Date.now()) {
        return Response.json({ error: "Session expired. Sign in again." }, { status: 401 });
      }
      const pair = pairs[slot];
      if (!pair) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const expected = await signToken(expiry, slot, pair.password);
      if (!safeEqual(parts[2], expected)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json({ spec: API_SPEC });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}