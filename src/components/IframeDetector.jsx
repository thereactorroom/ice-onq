import { useEffect } from "react";

const HOST_KEY = "__fusion_host";

function getBridgeUrl(host) {
  if (!host) return null;
  if (host.includes("uat")) return "https://uat.fusiononq.com/js/fusion.bridge.js?v=1.0";
  if (host.endsWith("fusiononq.com")) return "https://app.fusiononq.com/js/fusion.bridge.js?v=1.0";
  return null;
}

export default function IframeDetector() {
  useEffect(() => {
    const isIframe = window.self !== window.top;
    if (!isIframe) return;

    const ownHost = window.location.hostname;
    let host = "";
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
      document.head.appendChild(script);
    }
  }, []);

  return null;
}