// Example home page — replace with your own content.
// Demonstrates the mobile-first layout pattern with URL param access.
import { useParams } from "react-router-dom";
import { isInFusionIframe, getFusionHostUrl, fusionCall, fusionWhatsApp } from "@/lib/fusionBridge";
import { Button } from "@/components/ui/button";

export default function Home() {
  const params = new URLSearchParams(window.location.search);
  const fusionId = params.get("fID");
  const owner = params.get("Owner")?.toLowerCase() === "true";
  const launch = params.get("Launch");

  const isIframe = isInFusionIframe();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Welcome</h2>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
        <p className="text-sm text-muted-foreground">URL Parameters:</p>
        <ul className="text-sm space-y-1">
          <li><strong>fID:</strong> {fusionId || "(none)"}</li>
          <li><strong>Owner:</strong> {String(owner)}</li>
          <li><strong>Launch:</strong> {launch || "(none)"}</li>
          <li><strong>In iframe:</strong> {String(isIframe)}</li>
          <li><strong>Host URL:</strong> {isIframe ? getFusionHostUrl() : "(standalone)"}</li>
        </ul>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Bridge Action Examples:</p>
        <div className="flex gap-2">
          <Button onClick={() => fusionCall("+27123456789")} variant="outline" size="sm">
            Call
          </Button>
          <Button onClick={() => fusionWhatsApp("27123456789", "Hello from the app")} variant="outline" size="sm">
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}