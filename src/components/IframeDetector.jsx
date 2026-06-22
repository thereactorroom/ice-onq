import { useEffect } from "react";

const FUSION_BRIDGES = {
  "uat.fusiononq.com": "https://uat.fusiononq.com/js/fusion.bridge.js?v=1.0",
  "fusiononq.com": "https://app.fusiononq.com/js/fusion.bridge.js?v=1.0",
  "app.fusiononq.com": "https://app.fusiononq.com/js/fusion.bridge.js?v=1.0",
};

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
        host = "unknown";
      }
    }

    if (!host || host === "unknown") return;

    const bridgeSrc = FUSION_BRIDGES[host];
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