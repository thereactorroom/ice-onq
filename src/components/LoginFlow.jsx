import { useState } from "react";
import { Shield, ArrowLeft, Phone, MessageSquare, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProfileSelectorScreen from "./ProfileSelectorScreen";

// Steps: 'mobile' → 'method' → 'otp' → 'fid' → 'select_profile'
export default function LoginFlow({ onBack, onSuccess }) {
  const [step, setStep] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [method, setMethod] = useState("sms");
  const [otp, setOtp] = useState("");
  const [fid, setFid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleError(msg) {
    setError(msg);
    setLoading(false);
  }

  // ── Profile Selector (post-login) ──
  if (step === "select_profile") {
    return (
      <ProfileSelectorScreen
        guardianFid={fid}
        onBack={() => setStep("fid")}
        onSelect={(result) => {
          if (result.addDependent) {
            onSuccess({ addDependent: true, guardianFid: fid });
          } else {
            // Always pass guardianFid so ProfileView can show "Switch Profile" back button
            onSuccess({ fID: result.fID, owner: result.owner, guardianFid: fid });
          }
        }}
      />
    );
  }

  // ── Step: Mobile entry ──
  if (step === "mobile") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={onBack} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Sign in to fusion onQ</h2>
            <p className="text-sm text-muted-foreground">Enter your mobile number to receive a verification code.</p>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Mobile Number</label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+27 82 000 0000"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full h-11"
            disabled={!mobile.trim()}
            onClick={() => { setError(""); setStep("method"); }}
          >
            Continue
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Don't have fusion onQ yet?</p>
            <a href="https://app.fusiononq.com" target="_blank" rel="noreferrer" className="text-xs text-primary font-semibold underline">
              Register at fusiononq.com
            </a>
          </div>
        </div>
        <BottomBack onBack={onBack} />
      </div>
    );
  }

  // ── Step: Method selection ──
  if (step === "method") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("mobile")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">How would you like to verify?</h2>
            <p className="text-sm text-muted-foreground">We'll send a one-time code to {mobile}.</p>
          </div>
          <div className="space-y-3">
            {[
              { id: "sms", icon: MessageSquare, label: "SMS", desc: "Receive a text message" },
              { id: "whatsapp", icon: Phone, label: "WhatsApp", desc: "Receive a WhatsApp message" },
            ].map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                onClick={() => setMethod(id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full h-11" onClick={() => { setError(""); setStep("otp"); }}>
            Send Code
          </Button>
        </div>
        <BottomBack onBack={() => setStep("mobile")} />
      </div>
    );
  }

  // ── Step: OTP entry ──
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("method")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Enter your verification code</h2>
            <p className="text-sm text-muted-foreground">
              We sent a code via {method === "whatsapp" ? "WhatsApp" : "SMS"} to {mobile}.
            </p>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">One-Time Code</label>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-lg"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full h-11"
            disabled={!otp.trim() || loading}
            onClick={() => { setError(""); setStep("fid"); }}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
          <button onClick={() => setStep("method")} className="w-full text-xs text-muted-foreground hover:text-primary transition-colors">
            Resend code
          </button>
        </div>
        <BottomBack onBack={() => setStep("method")} />
      </div>
    );
  }

  // ── Step: FID entry (demo/testing flow) ──
  if (step === "fid") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("otp")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          <div className="space-y-2">
            <KeyRound className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Enter your fusion ID</h2>
            <p className="text-sm text-muted-foreground">Enter your fusion onQ user ID to access your ICE profiles.</p>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">fusion ID</label>
            <input
              type="number"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="e.g. 32"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full h-11"
            disabled={!fid.trim() || loading}
            onClick={() => {
              setError("");
              setLoading(true);
              base44.functions.invoke("getPublicICEProfile", {
                profileId: fid,
                fusionUser: { userId: fid },
                fusionHost: window.location.origin,
              })
                .then(() => {
                  setLoading(false);
                  // Go to profile selector — not directly to the profile
                  setStep("select_profile");
                })
                .catch((e) => handleError(e?.response?.data?.error || e?.message || "Could not find profile."));
            }}
          >
            {loading ? "Loading..." : "Access My Profiles"}
          </Button>
        </div>
        <BottomBack onBack={() => setStep("otp")} />
      </div>
    );
  }

  return null;
}

function Header({ onBack }) {
  return (
    <div className="bg-primary shadow-lg">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors mr-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <Shield className="w-6 h-6 text-white" />
        <div>
          <div className="font-bold text-white tracking-wider leading-none">ICE onQ</div>
          <div className="text-white/70 text-xs mt-0.5">In Case of Emergency</div>
        </div>
      </div>
    </div>
  );
}

function BottomBack({ onBack }) {
  return (
    <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 max-w-lg mx-auto w-full">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
    </div>
  );
}