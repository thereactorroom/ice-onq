import { Shield, QrCode, ExternalLink, Download } from "lucide-react";

// Shown when a scanned QR token has no emergency information linked to it.
// Acts as an onboarding gateway guiding the user to claim the code.
export default function UnlinkedQRCodeView({ qrToken }) {
  const fusionAppUrl = "https://app.fusiononq.com";
  const healthOnQUrl = "https://app.fusiononq.com";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        {/* Icon + Title */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <QrCode className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">No Emergency Information Linked</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            No emergency information is currently linked to this QR code.
          </p>
        </div>

        {/* If this is your QR code */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-bold text-foreground text-sm">If this is your QR code:</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Open <strong>Health onQ</strong> in your <strong>fusion onQ</strong> app and link this QR code to your ICE onQ profile.
          </p>
          <a
            href={healthOnQUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold text-sm py-3 rounded-xl hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open Health onQ
          </a>
        </div>

        {/* Don't have a profile yet */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <h2 className="font-bold text-foreground text-sm">Don't have an ICE onQ profile yet?</h2>
          <ol className="space-y-2.5 text-sm text-muted-foreground">
            {[
              "Download the fusion onQ app from the App Store or Google Play.",
              "Open Health onQ.",
              "Create your ICE onQ profile.",
              "Link this QR code to your profile.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <a
            href={fusionAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-foreground text-background font-semibold text-sm py-3 rounded-xl hover:bg-foreground/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download fusion onQ
          </a>
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
          Once linked, scanning this QR code will provide access to the emergency information you have chosen to make available.
        </p>
      </div>
    </div>
  );
}