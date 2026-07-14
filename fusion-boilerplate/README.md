# fusion onQ — Base44 Boilerplate

A reusable starting point for Base44 apps that need:
- **Secure iframe embedding** inside a fusiononq.com (or similar) host app
- **Bridge communication** (`FusionBridge` / `NativeBridge`) for native actions (calls, SMS, WhatsApp, downloads)
- **Mobile-first UI/UX** with sticky header + bottom navigation
- **URL-parameter-driven routing** (`?fID=…&Owner=…&Launch=…`) — no session-based state
- **Auth gating** with optimistic UI for iframe contexts

---

## Quick Start

1. **Create a new Base44 app** from the dashboard.
2. Copy every file from `fusion-boilerplate/src/` into your new project's `src/` directory.
3. Copy `fusion-boilerplate/tailwind.config.js` → `tailwind.config.js`.
4. Copy `fusion-boilerplate/base44/functions/getFusionUser/entry.ts` → `base44/functions/getFusionUser/entry.ts`.
5. **Edit `src/lib/fusionConfig.js`** — update the host domain, bridge script URLs, and app branding.
6. Install the standard Base44 auth pages (Login, Register, ForgotPassword, ResetPassword) — they ship with every new app.
7. Start building your pages under `src/pages/`.

---

## File Overview

| File | Purpose |
|---|---|
| `src/lib/fusionConfig.js` | **Edit this first.** All configurable values in one place. |
| `src/lib/fusionBridge.js` | Iframe detection + bridge accessor + native action helpers (call/SMS/WhatsApp/download). |
| `src/components/IframeDetector.jsx` | Injects the host bridge script when embedded in an iframe. |
| `src/lib/AuthContext.jsx` | Auth state provider (public settings + user session). |
| `src/components/ProtectedRoute.jsx` | Route guard — renders `<Outlet />` when authenticated. |
| `src/components/UserNotRegisteredError.jsx` | Shown when a logged-in user lacks app access. |
| `src/components/Layout.jsx` | Mobile-first shell: sticky header + bottom nav, preserves URL params. |
| `src/components/LoadingSkeleton.jsx` | Animated loading placeholder matching the layout. |
| `src/hooks/useQueryString.js` | Returns `?param=value` from the current URL for param-preserving navigation. |
| `src/App.jsx` | Router with iframe-aware auth gating + URL-param redirect logic. |
| `src/index.css` | Design tokens (colors, fonts, radius). |
| `tailwind.config.js` | Tailwind theme mapped to CSS tokens. |
| `base44/functions/getFusionUser/entry.ts` | Backend function: fusion session → user identity handshake. |

---

## How the Fusion Bridge Works

### Iframe Detection (`isInFusionIframe()`)

The app can run in two contexts:
1. **Standalone web** — `window.self === window.top`. No bridge. Standard browser behavior.
2. **Embedded iframe** — hosted by fusiononq.com (or a configured subdomain). The host injects `fusion.bridge.js` and `native.bridge.js` scripts that expose global `FusionBridge` and `NativeBridge` objects.

Detection priority (in `fusionBridge.js`):
1. Top-level window → never a fusion iframe.
2. Fresh parent host check (`window.parent.location.hostname` or `document.referrer`).
3. SessionStorage cache (survives internal navigation when referrer = own host).
4. Bridge global existence fallback (`window.__fusiononqBridge` or `getGlobalBridge("FusionBridge")`).

### Bridge Actions

| Helper | Native (iframe) | Web fallback |
|---|---|---|
| `fusionCall(tel)` | `NativeBridge.openPhone({ tel })` | `tel:` link |
| `fusionSMS(to, body)` | `NativeBridge.openSMS({ to, body })` | `sms:` link |
| `fusionDownload(url, filename)` | `NativeBridge.download()` → `FusionBridge.send()` → `postMessage` | `<a download>` |
| `fusionWhatsApp(phone, text)` | `NativeBridge.openWhatsApp()` → `FusionBridge.openWhatsApp()` → `postMessage` | `wa.me` link |

### Receiving Bridge Events

The host can send messages to the iframe via `postMessage` or by calling a registered `FusionBridge.listener(callback)`. Your component listens for `{ jump: "fusionId" }` or `{ updateContext: { fID, Owner, Launch } }` and reacts accordingly. See `App.jsx` for the listener pattern.

---

## URL Parameter Navigation

This app uses URL parameters (not session state) to control routing and access:

| Param | Values | Meaning |
|---|---|---|
| `fID` | number / `0` | Fusion user ID. `0` = demo profile. Missing = intro screen. |
| `Owner` | `True` / `False` | Whether the viewer can edit. |
| `Launch` | `New` / `View` / `Profile` | `New` = intro screen; `View` = read-only; `Profile` = profile selector. |
| `DevMode` | `True` | Enables developer features (e.g., Help button). |
| `session` | string | Fusion session token (for `getFusionUser` handshake). |

---

## Customization Checklist

- [ ] `src/lib/fusionConfig.js` — host domain, bridge script URLs, app name/colors.
- [ ] `src/components/Layout.jsx` — nav items, header branding.
- [ ] `src/index.css` — color tokens (`--primary`, `--background`, `--emergency`, etc.).
- [ ] `tailwind.config.js` — extend with project-specific needs.
- [ ] `src/App.jsx` — add your page routes inside `<Routes>`.
- [ ] `base44/functions/getFusionUser/entry.ts` — adjust the fusion API endpoints if the host API differs.

---

## Backend Secrets

If your app sends emails or accesses external APIs, set secrets in the dashboard:

```
Dashboard → Settings → Environment Variables
```

The `getFusionUser` function needs no secrets — it calls the host's public API with the session token.