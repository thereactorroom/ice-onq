import { useEffect } from "react";
import { FUSION_CONFIG } from "@/lib/fusionConfig";

// Determines the correct bridge script URL based on the parent host
function getBridgeUrl(host) {
  if (!host) return null;
  if (host.includes(FUSION_CONFIG.UAT_SUBSTRING)) return FUSION_CONFIG.BRIDGE_SCRIPT_UAT;
  if (host.endsWith(FUSION_CONFIG.HOST_DOMAIN)) return FUSION_CONFIG.BRIDGE_SCRIPT_PROD;
  return null;
}

// Detects if the app is embedded in an iframe and injects the host's bridge
// script so that FusionBridge / NativeBridge globals become available.
// This component renders nothing — it runs a side effect on mount.
export default function IframeDetector() {
  useEffect(() => {
    const isIframe = window.self !== window.top;
    if (!isIframe) return;

    let host = "";
    try {
      host = window.parent.location.hostname; // same-origin parent
    } catch {
      try {
        const url = new URL(document.referrer);
        host = url.hostname; // cross-origin parent via referrer
      } catch {
        host = "";
      }
    }

    const bridgeSrc = getBridgeUrl(host);
    if (bridgeSrc) {
      window[FUSION_CONFIG.BRIDGE_FLAG] = true;
      const script = document.createElement("script");
      script.src = bridgeSrc;
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return null;
}