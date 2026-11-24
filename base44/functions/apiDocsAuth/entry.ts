import { secrets } from "base44:runtime";
import { API_SPEC } from "../../shared/apiSpec.ts";

// Gate for the internal API documentation page.
// The spec itself lives in base44/shared/apiSpec.ts, so it never reaches the
// public client bundle: it is only returned here, after a correct login.
//
// Secrets: API_DOCS_USERNAME, API_DOCS_PASSWORD.
// Tokens are HMAC-signed with the password, so changing the password ends
// every open docs session.

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

async function signToken(expiry, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`iceonq-docs:${expiry}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    const configuredUser = secrets.get("API_DOCS_USERNAME");
    const configuredPass = secrets.get("API_DOCS_PASSWORD");
    if (!configuredUser || !configuredPass) {
      return Response.json(
        { error: "API documentation access is not configured yet. Set API_DOCS_USERNAME and API_DOCS_PASSWORD." },
        { status: 503 }
      );
    }

    if (action === "login") {
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!username || !password) {
        return Response.json({ error: "Username and password are required." }, { status: 400 });
      }

      const userMatch = safeEqual(await sha256Hex(username), await sha256Hex(configuredUser));
      const passMatch = safeEqual(await sha256Hex(password), await sha256Hex(configuredPass));
      if (!userMatch || !passMatch) {
        return Response.json({ error: "Invalid username or password." }, { status: 401 });
      }

      const expiresAt = Date.now() + TOKEN_TTL_MS;
      const signature = await signToken(expiresAt, configuredPass);
      return Response.json({ token: `${expiresAt}.${signature}`, expiresAt });
    }

    if (action === "spec") {
      const token = String(body.token || "");
      const parts = token.split(".");
      if (parts.length !== 2) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      const expiry = Number(parts[0]);
      if (!Number.isFinite(expiry) || expiry < Date.now()) {
        return Response.json({ error: "Session expired. Sign in again." }, { status: 401 });
      }
      const expected = await signToken(expiry, configuredPass);
      if (!safeEqual(parts[1], expected)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.json({ spec: API_SPEC });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}