import { useState } from "react";
import { Shield, ArrowLeft, KeyRound, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import ProfileSelectorScreen from "./ProfileSelectorScreen";
import FusionRegisterForm from "./FusionRegisterForm";
import { routeAfterFusionAuth } from "@/lib/fusionAuthRouting";

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
  const [isNewUser, setIsNewUser] = useState(false);

  // ── Verify the mobile number against fusion onQ ──
  function handleUserCheck() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionUserCheck", { mobile })
      .then(async (res) => {
        const data = res.data;
        setLoading(false);
        if (data && data.result && data.user) {
          setIsNewUser(false);
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
          // Not registered on fusion yet — verify the number via OTP,
          // then offer in-app fusion onQ registration
          setIsNewUser(true);
          const otpRes = await base44.functions.invoke("fusionSendOtp", { mobile });
          const otpData = otpRes.data;
          setLoading(false);
          if (!otpData || !otpData.result) {
            setError(otpData?.reason || "Could not send the one-time code.");
            return;
          }
          setStep("otp");
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
        if (isNewUser) {
          setLoading(false);
          setStep("register");
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
    setLoading(true);
    await routeAfterFusionAuth(user);
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
          <p className="text-xs text-muted-foreground text-center">
            New to fusion onQ? Continue with your mobile number — we'll verify it and set up your account.
          </p>
        </div>
        <BottomBack onBack={onBack} />
      </div>
    );
  }

  // ── Step: Register a new fusion onQ account (verified, not yet on fusion) ──
  if (step === "register") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header onBack={() => setStep("otp")} />
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
          <FusionRegisterForm mobile={mobile} onRegistered={(user) => routeAfterAuth(user)} />
        </div>
        <BottomBack onBack={() => setStep("otp")} />
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
              {isNewUser
                ? "This number isn't on fusion onQ yet — we'll verify it now and set up your account."
                : "You don't have a fusion onQ password yet, so you'll be verified via a one-time code."}
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
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="00000"
              autoComplete="one-time-code"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-lg"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full h-11"
            disabled={otp.length < 4 || loading}
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