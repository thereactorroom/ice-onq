import { useEffect } from "react";

const HOST_KEY = "__fusion_host";

function detectHost() {
  const ownHost = window.location.hostname;
  let host = "";
  if (window.self !== window.top) {
    try {
      const parentHost = window.parent.location.hostname; // same-origin parent
      if (parentHost && parentHost !== ownHost) host = parentHost;
    } catch {
      try {
        const refHost = new URL(document.referrer).hostname; // cross-origin parent
        if (refHost && refHost !== ownHost) host = refHost;
      } catch {
        host = "";
      }
    }
  }
  return { host, ownHost };
}

function getBridgeUrl(host) {
  if (!host) return null;
  if (host.includes("uat")) return "https://uat.fusiononq.com/js/fusion.bridge.js?v=1.0";
  if (host.endsWith("fusiononq.com")) return "https://app.fusiononq.com/js/fusion.bridge.js?v=1.0";
  return null;
}

// Log the environment the moment the bundle loads — before React mounts and
// before any redirect happens — so it always reaches the console.
(function logEnvironment() {
  const { host, ownHost } = detectHost();
  let cachedHost = "";
  try { cachedHost = sessionStorage.getItem(HOST_KEY) || ""; } catch {}
  const bridgeSrc = getBridgeUrl(host) || (cachedHost ? getBridgeUrl(cachedHost) : null);
  console.log(
    "[FusionEnv] App origin:", window.location.origin,
    "| in iframe:", window.self !== window.top,
    "| parent host:", host || "(undetectable)",
    "| cached host:", cachedHost || "(none)",
    "| bridge URL:", bridgeSrc || "(none)"
  );
})();

export default function IframeDetector() {
  useEffect(() => {
    const isIframe = window.self !== window.top;
    if (!isIframe) return;

    let { host } = detectHost();

    // Fallback to cached host — survives internal full reloads (where the
    // referrer is our own URL) and iframe reloads where the referrer is empty.
    if (!host) {
      try { host = sessionStorage.getItem(HOST_KEY) || ""; } catch {}
    }

    const bridgeSrc = getBridgeUrl(host);
    if (bridgeSrc) {
      try { sessionStorage.setItem(HOST_KEY, host); } catch {}
      window.__fusiononqBridge = true;
      const script = document.createElement("script");
      script.src = bridgeSrc;
      script.async = true;
      script.onload = () => console.log("[FusionEnv] Bridge script loaded:", bridgeSrc);
      script.onerror = () => console.warn("[FusionEnv] Bridge script FAILED to load:", bridgeSrc);
      document.head.appendChild(script);
    }
  }, []);

  return null;
}