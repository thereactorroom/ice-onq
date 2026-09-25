import { useState } from "react";
import { Shield, QrCode } from "lucide-react";
import ClaimQRCodeFlow from "./ClaimQRCodeFlow";

// Shown when a scanned QR token has no emergency information linked to it.
// Lets the user verify their mobile number and link the QR code to their
// ICE profile. Once linking reaches a terminal state (success / declined /
// claimed), the "No Emergency Information Linked" header is hidden so the
// result reads as a full page rather than an overlay.
const TERMINAL_STEPS = ["success", "declined", "claimed"];

export default function UnlinkedQRCodeView({ qrToken }) {
  const [flowStep, setFlowStep] = useState("mobile");
  const isTerminal = TERMINAL_STEPS.includes(flowStep);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Brand bar — normal top bar (not sticky, which clips inside the fusion iframe) */}
      <div className="bg-primary shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
        </div>
      </div>

      {/* Content: centered vertically for terminal states, top-aligned otherwise */}
      <div
        className={
          "flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6 " +
          (isTerminal ? "flex flex-col items-center justify-center" : "")
        }
      >
        {/* "No Emergency Information Linked" intro — hidden once the QR
            code is linked (or the flow otherwise reaches a terminal state) */}
        {!isTerminal && (
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <QrCode className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">No Emergency Information Linked</h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              No emergency information is currently linked to this QR code.
            </p>
          </div>
        )}

        {/* Link this QR code to your ICE profile (mobile verification) */}
        <ClaimQRCodeFlow qrToken={qrToken} onStepChange={setFlowStep} />

        {/* Footer note — hidden in terminal states */}
        {!isTerminal && (
          <p className="text-xs text-muted-foreground text-center leading-relaxed px-4">
            Once linked, scanning this QR code will provide access to the emergency information you have chosen to make available.
          </p>
        )}
      </div>
    </div>
  );
}