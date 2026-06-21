import { useState } from "react";
import { Shield, ArrowLeft, Phone, MessageSquare, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Steps: 'identity' → 'otp' → 'fusion_pending'
export default function CreateProfileFlow({ onBack }) {
  const [step, setStep] = useState("identity");
  const [mobile, setMobile] = useState("");
  const [method, setMethod] = useState("sms");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: Identity & Verification Method ──
  if (step === "identity") {
    return (
      <FlowShell onBack={onBack} title="Create Your ICE Profile" subtitle="Step 1 of 3 — Your contact details">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+27 82 000 0000"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Verify via</label>
            <div className="space-y-2">
              {[
                { id: "sms", icon: MessageSquare, label: "SMS", desc: "Text message to your mobile" },
                { id: "whatsapp", icon: Phone, label: "WhatsApp", desc: "WhatsApp message to your mobile" },
                { id: "email", icon: Mail, label: "Email", desc: "One-time code to your email address" },
              ].map(({ id, icon: Icon, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left ${
                    method === id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {method === "email" && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          className="w-full h-11 mt-6"
          disabled={!mobile.trim() || (method === "email" && !email.trim())}
          onClick={() => {
            setError("");
            // TODO: Trigger OTP send via fusion API
            setStep("otp");
          }}
        >
          Send Verification Code
        </Button>
      </FlowShell>
    );
  }

  // ── Step 2: OTP Verification ──
  if (step === "otp") {
    const methodLabel = method === "whatsapp" ? "WhatsApp" : method === "email" ? `email (${email})` : `SMS to ${mobile}`;
    return (
      <FlowShell onBack={() => { setStep("identity"); setOtp(""); setError(""); }} title="Verify Your Identity" subtitle="Step 2 of 3 — Enter your code">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a one-time code via <span className="font-medium text-foreground">{methodLabel}</span>. Enter it below.
          </p>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Verification Code</label>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-xl"
            />
          </div>
          <button
            onClick={() => { setStep("identity"); setOtp(""); }}
            className="text-xs text-primary font-medium hover:underline"
          >
            Change contact details or method
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          className="w-full h-11 mt-6"
          disabled={!otp.trim() || loading}
          onClick={() => {
            setError("");
            setLoading(true);
            // TODO: Verify OTP via fusion API
            // On success, fusion will return/create the fID for this identity
            // For now we advance to the pending state
            setTimeout(() => {
              setLoading(false);
              setStep("fusion_pending");
            }, 800);
          }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify Code"}
        </Button>
      </FlowShell>
    );
  }

  // ── Step 3: Fusion Handshake Pending ──
  // Fusion will resolve or create the fID here.
  // NO ICE record is created at this stage.
  if (step === "fusion_pending") {
    return (
      <FlowShell onBack={() => { setStep("otp"); setError(""); }} title="Linking to fusion onQ" subtitle="Step 3 of 3 — Account setup">
        <div className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3 text-center">
            <CheckCircle className="w-10 h-10 text-primary mx-auto" />
            <p className="font-semibold text-foreground">Identity Verified</p>
            <p className="text-sm text-muted-foreground">
              Your identity has been confirmed. We are now linking your account with fusion onQ to obtain your unique fusion ID.
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              If you are new to fusion onQ, a new profile will be created for you automatically.
            </p>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <p className="text-xs text-warning font-semibold uppercase tracking-wider mb-1">Awaiting fusion onQ</p>
            <p className="text-xs text-muted-foreground">
              The fusion integration is pending configuration. Once connected, this step will automatically resolve your fusion ID and proceed to create your ICE profile.
            </p>
          </div>
        </div>

        {/* Back button — always available so the user is never stuck */}
        <Button variant="outline" className="w-full h-11 mt-6 gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to Start
        </Button>
      </FlowShell>
    );
  }

  return null;
}

// ── Shared shell with header and back navigation ──────────────────────────────
function FlowShell({ onBack, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-6 h-6 text-white" />
          <div>
            <div className="font-bold text-white tracking-wider leading-none">ICE onQ</div>
            <div className="text-white/70 text-xs mt-0.5">In Case of Emergency</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{subtitle}</p>}
        </div>
        <div className="flex-1">{children}</div>
      </div>

      {/* Sticky bottom back button */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 max-w-lg mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
  );
}