import { Shield, QrCode } from "lucide-react";
import ClaimQRCodeFlow from "./ClaimQRCodeFlow";

// Shown when a scanned QR token has no emergency information linked to it.
// Lets the user verify their mobile number and link the QR code to their
// ICE profile.
export default function UnlinkedQRCodeView({ qrToken }) {

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

        {/* Link this QR code to your ICE profile (mobile verification) */}
        <ClaimQRCodeFlow qrToken={qrToken} />

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
          Once linked, scanning this QR code will provide access to the emergency information you have chosen to make available.
        </p>
      </div>
    </div>
  );
}