import { useEffect } from "react";

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

    let host = "";
    try {
      host = window.parent.location.hostname;
    } catch {
      try {
        const url = new URL(document.referrer);
        host = url.hostname;
      } catch {
        host = "";
      }
    }

    const bridgeSrc = getBridgeUrl(host);
    if (bridgeSrc) {
      window.__fusiononqBridge = true;
      const script = document.createElement("script");
      script.src = bridgeSrc;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}