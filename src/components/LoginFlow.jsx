import { useState } from "react";
import { Shield, ArrowLeft, KeyRound, MessageSquare, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProfileSelectorScreen from "./ProfileSelectorScreen";

// Steps: 'mobile' → fusion userCheck → 'not_found' | 'password' | 'otp' → 'select_profile'
export default function LoginFlow({ onBack, onSuccess }) {
  const [step, setStep] = useState("mobile");
  const [mobile, setMobile] = useState("");
  const [fid, setFid] = useState("");
  const [fusionUser, setFusionUser] = useState(null);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Verify the mobile number against fusion onQ ──
  function handleUserCheck() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionUserCheck", { mobile })
      .then(async (res) => {
        const data = res.data;
        setLoading(false);
        if (data && data.result && data.user) {
          setFusionUser(data.user);
          setFid(String(data.user.userId));
          if (String(data.user.hasPassword) === "true") {
            setStep("password");
          } else {
            // No password set — request an SMS one-time code from fusion onQ
            const otpRes = await base44.functions.invoke("fusionSendOtp", { mobile });
            const otpData = otpRes.data;
            if (!otpData || !otpData.result) {
              setError(otpData?.reason || "Could not send the one-time code.");
              return;
            }
            setStep("otp");
          }
        } else {
          setStep("not_found");
        }
      })
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Could not verify your mobile number.");
        setLoading(false);
      });
  }

  // ── Verify the fusion onQ password, then route to profile / creation ──
  function handlePasswordSignIn() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionSignIn", { mobile, password })
      .then(async (res) => {
        const data = res.data;
        if (!data || !data.result || !data.user) {
          setError(data?.reason || "Invalid password");
          setLoading(false);
          return;
        }
        const user = data.user;
        setFusionUser(user);
        setFid(String(user.userId));
        await routeAfterAuth(user);
      })
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Could not sign in.");
        setLoading(false);
      });
  }

  // ── Verify the SMS one-time code, then route to profile / creation ──
  function handleVerifyOtp() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionVerifyOtp", { mobile, code: otp })
      .then(async (res) => {
        const data = res.data;
        if (!data || !data.result) {
          setError(data?.reason || "Invalid OTP code");
          setLoading(false);
          return;
        }
        await routeAfterAuth(fusionUser);
      })
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Could not verify the code.");
        setLoading(false);
      });
  }

  // ── Shared post-verification routing: "Your ICE Profiles" or creation ──
  async function routeAfterAuth(user) {
    // Does this fusion user already have an ICE profile?
    try {
      const check = await base44.functions.invoke("checkProfileExists", { id: String(user.userId) });
      if (check.data?.exists) {
        window.location.href = `/profile?fID=${user.userId}&Launch=Profile&Owner=True`;
        return;
      }
    } catch { /* check failed — fall through to creation */ }
    // No ICE profile yet — create the fusion relationship (profile shell
    // seeded from the fusion account), then drop into profile creation
    try {
      await base44.functions.invoke("getPublicICEProfile", {
        profileId: String(user.userId),
        fusionUser: { userId: user.userId, name: user.name, surname: user.surname, dob: user.dob, picture: user.picture },
        fusionHost: "https://app.fusiononq.com",
      });
    } catch { /* shell creation failed — still route to their profile area */ }
    setLoading(false);
    window.location.href = `/profile?fID=${user.userId}&owner=true&newProfile=true`;
  }

  // ── Profile Selector (post-login) ──
  if (step === "select_profile") {
    return (
      <ProfileSelectorScreen
        guardianFid={fid}
        onBack={() => setStep("mobile")}
        onSelect={(result) => {
          if (result.addDependent) {
            onSuccess({ addDependent: true, guardianFid: fid });
          } else {
            // Always pass guardianFid so ProfileView can show "Switch Profile" back button
            onSuccess({ fID: result.fID, owner: result.owner, guardianFid: fid, isDbId: result.isDbId });
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
            <p className="text-sm text-muted-foreground">Enter your mobile number to access your ICE profiles.</p>
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
            disabled={!mobile.trim() || loading}
            onClick={handleUserCheck}
          >
            {loading ? "Verifying..." : "Sign In"}
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

  // ── Step: Not on fusion (temp holding page) ──
  if (step === "not_found") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("mobile")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <UserX className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Mobile number not found</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            <span className="font-semibold">{mobile}</span> isn't registered with fusion onQ yet. You'll need a fusion onQ account before you can activate your ICE profile.
          </p>
          <a href="https://app.fusiononq.com" target="_blank" rel="noreferrer" className="mt-4 text-sm text-primary font-semibold underline">
            Register at fusiononq.com
          </a>
        </div>
        <BottomBack onBack={() => setStep("mobile")} />
      </div>
    );
  }

  // ── Step: fusion onQ password ──
  if (step === "password") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("mobile")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          <div className="space-y-2">
            <KeyRound className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Enter your fusion onQ password</h2>
            <p className="text-sm text-muted-foreground">
              Welcome back{fusionUser?.name ? `, ${fusionUser.name}` : ""}. Enter the password you use for fusion onQ.
            </p>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your fusion onQ password"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full h-11"
            disabled={!password.trim() || loading}
            onClick={handlePasswordSignIn}
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </div>
        <BottomBack onBack={() => setStep("mobile")} />
      </div>
    );
  }

  // ── Step: OTP verification (no fusion password set) ──
  if (step === "otp") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("mobile")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
          <div className="space-y-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Verify with a one-time code</h2>
            <p className="text-sm text-muted-foreground">
              You don't have a fusion onQ password yet, so you'll be verified via a one-time code.
            </p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-foreground">
              We've sent a one-time code via SMS to <span className="font-semibold">{mobile}</span>. Enter it below to continue.
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">
              fusion onQ limits one-time codes to 3 per mobile number every 24 hours.
            </p>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">One-Time Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="00000"
              autoComplete="one-time-code"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-lg"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full h-11"
            disabled={otp.length < 5 || loading}
            onClick={handleVerifyOtp}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>
        </div>
        <BottomBack onBack={() => setStep("mobile")} />
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