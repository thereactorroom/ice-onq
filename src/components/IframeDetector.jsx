import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

const FUSION_BRIDGES = {
  "uat.fusiononq.com": "https://uat.fusiononq.com/js/fusion.bridge.js",
  "fusiononq.com": "https://app.fusiononq.com/js/fusion.bridge.js",
  "app.fusiononq.com": "https://app.fusiononq.com/js/fusion.bridge.js",
};

// Other trusted hosts that should load silently (no popup, no bridge)
const TRUSTED_HOSTS = [];

export default function IframeDetector() {
  const [hostname, setHostname] = useState(null);
  const [visible, setVisible] = useState(false);

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

    if (!host || host === "unknown") {
      setHostname("unknown");
      setVisible(true);
      return;
    }

    // Inject Fusion bridge script if host matches
    const bridgeSrc = FUSION_BRIDGES[host];
    if (bridgeSrc) {
      const script = document.createElement("script");
      script.src = bridgeSrc;
      script.async = true;
      document.head.appendChild(script);
      return;
    }

    // Skip popup for other trusted hosts
    const isTrusted = TRUSTED_HOSTS.some(
      (trusted) => host === trusted || host.endsWith("." + trusted)
    );
    if (isTrusted) return;

    setHostname(host);
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">ICE onQ</h3>
              <p className="text-xs text-muted-foreground">Embedded in another site</p>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Host page</p>
          <p className="text-sm font-mono text-foreground break-all">{hostname}</p>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Your ICE profile is being viewed from another website. All emergency information remains secure and accessible only to those with your profile link.
        </p>
      </div>
    </div>
  );
}