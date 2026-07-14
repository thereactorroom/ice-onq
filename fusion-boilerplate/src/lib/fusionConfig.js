// ═══════════════════════════════════════════════════════════════════════════
// fusionConfig.js — EDIT THIS FILE FIRST
// All configurable values for the fusion bridge + iframe system in one place.
// ═══════════════════════════════════════════════════════════════════════════

export const FUSION_CONFIG = {
  // ── Host Domain Detection ──────────────────────────────────────────────────
  // The parent domain that embeds your app in an iframe.
  // isInFusionIframe() checks if the parent hostname ENDS WITH this value.
  HOST_DOMAIN: "fusiononq.com",

  // UAT subdomain substring — if the parent host contains this, use the UAT bridge.
  UAT_SUBSTRING: "uat",

  // Production bridge script URL (injected when embedded in prod iframe)
  BRIDGE_SCRIPT_PROD: "https://app.fusiononq.com/js/fusion.bridge.js?v=1.0",

  // UAT bridge script URL
  BRIDGE_SCRIPT_UAT: "https://uat.fusiononq.com/js/fusion.bridge.js?v=1.0",

  // Production host base URL (used for getFusionUser API calls)
  HOST_URL_PROD: "https://app.fusiononq.com",

  // UAT host base URL
  HOST_URL_UAT: "https://uat.fusiononq.com",

  // ── Bridge Global Names ─────────────────────────────────────────────────────
  // Names of global objects exposed by the injected bridge scripts.
  FUSION_BRIDGE_NAME: "FusionBridge",
  NATIVE_BRIDGE_NAME: "NativeBridge",
  BRIDGE_FLAG: "__fusiononqBridge", // set on window when bridge script loads

  // ── SessionStorage Cache Key ────────────────────────────────────────────────
  // Used to cache iframe detection across internal navigations.
  SESSION_CACHE_KEY: "__fusion_iframe",

  // ── App Branding ────────────────────────────────────────────────────────────
  APP_NAME: "Your App",
  APP_TAGLINE: "Your tagline here",
};