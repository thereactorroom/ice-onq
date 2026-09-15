import { useState } from "react";
import { Shield, ArrowLeft, KeyRound, Loader2, CheckCircle, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import FusionRegisterForm from "./FusionRegisterForm";
import { routeAfterFusionAuth } from "@/lib/fusionAuthRouting";

// Steps: 'who' → 'dependent_name' (if dependent) → 'identity' → 'otp' → 'fusion_pending'
export default function CreateProfileFlow({ onBack, guardianFid = null }) {
  const [step, setStep] = useState("who");
  const [profileType, setProfileType] = useState("self"); // 'self' | 'dependent'
  const [dependentName, setDependentName] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  // ── Guardian verification — same methodology as sign-in ──
  // Mobile → fusion userCheck → password (if set) or SMS one-time code
  function handleVerifyIdentity() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionUserCheck", { mobile })
      .then(async (res) => {
        const data = res.data;
        if (data && data.result && data.user) {
          setIsNewUser(false);
          if (String(data.user.hasPassword) === "true") {
            setLoading(false);
            setStep("password");
          } else {
            // No password set — request an SMS one-time code from fusion onQ
            const otpRes = await base44.functions.invoke("fusionSendOtp", { mobile });
            const otpData = otpRes.data;
            setLoading(false);
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

  // ── Step 0: Who is this profile for? ──
  if (step === "who") {
    return (
      <FlowShell onBack={onBack} title="Create an ICE Profile" subtitle="Step 1 — Who is this profile for?">
        <div className="space-y-3">
          {[
            {
              id: "self",
              icon: User,
              label: "Myself",
              desc: "Create my own emergency profile",
            },
            {
              id: "dependent",
              icon: Users,
              label: "Someone I care for",
              desc: "A child, elderly parent, or other dependent",
            },
          ].map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => setProfileType(id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-colors text-left ${
                profileType === id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}

          {profileType === "dependent" && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                You will be set as the guardian for this profile. You can manage it from your own ICE dashboard at any time.
              </p>
            </div>
          )}
        </div>

        <Button
          className="w-full h-11 mt-6"
          onClick={() => {
            setError("");
            if (profileType === "dependent") {
              setStep("dependent_name");
            } else {
              setStep("identity");
            }
          }}
        >
          Continue
        </Button>
      </FlowShell>
    );
  }

  // ── Step 1b: Dependent details ──
  if (step === "dependent_name") {
    const RELATIONSHIPS = ["Child", "Parent", "Spouse / Partner", "Sibling", "Grandparent", "Other"];
    return (
      <FlowShell
        onBack={() => { setStep("who"); setError(""); }}
        title="Dependent Details"
        subtitle="Step 2 — Tell us about them"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We will create a separate ICE profile for this person, linked to your account so you can manage it.
          </p>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Full Name</label>
            <input
              type="text"
              value={dependentName}
              onChange={(e) => setDependentName(e.target.value)}
              placeholder="e.g. Sarah Johnson"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Your Relationship to Them</label>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r}
                  onClick={() => setDependentRelationship(r)}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    dependentRelationship === r
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          className="w-full h-11 mt-6"
          disabled={!dependentName.trim() || !dependentRelationship}
          onClick={() => { setError(""); setStep("identity"); }}
        >
          Continue
        </Button>
      </FlowShell>
    );
  }

  // ── Step 2: Guardian / Account Holder Identity ──
  const stepNum = profileType === "dependent" ? "3" : "2";
  const totalSteps = profileType === "dependent" ? "4" : "3";

  if (step === "identity") {
    return (
      <FlowShell
        onBack={() => { setStep(profileType === "dependent" ? "dependent_name" : "who"); setError(""); }}
        title={profileType === "dependent" ? "Your Contact Details" : "Your Contact Details"}
        subtitle={`Step ${stepNum} of ${totalSteps} — Guardian verification`}
      >
        <div className="space-y-5">
          {profileType === "dependent" && (
            <div className="bg-muted/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-foreground">
                Creating profile for <span className="font-semibold">{dependentName}</span>
                <span className="text-muted-foreground"> · {dependentRelationship}</span>
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">
              {profileType === "dependent" ? "Your Mobile Number" : "Mobile Number"}
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+27 82 000 0000"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            {profileType === "dependent" && (
              <p className="text-xs text-muted-foreground">
                We verify <em>your</em> identity as the guardian — the dependent doesn't need their own phone.
              </p>
            )}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-sm text-foreground">
              We'll verify <span className="font-semibold">{mobile || "your mobile number"}</span> with fusion onQ — using your fusion onQ password, or a one-time SMS code if you don't have one yet.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          className="w-full h-11 mt-6"
          disabled={!mobile.trim() || loading}
          onClick={handleVerifyIdentity}
        >
          {loading ? "Verifying..." : "Continue"}
        </Button>
      </FlowShell>
    );
  }

  // ── Step: fusion onQ password (guardian has a password set) ──
  if (step === "password") {
    return (
      <FlowShell
        onBack={() => { setStep("identity"); setPassword(""); setError(""); }}
        title="Your fusion onQ Password"
        subtitle={`Step ${parseInt(stepNum) + 1} of ${totalSteps} — Guardian verification`}
      >
        <div className="space-y-5">
          {profileType === "dependent" && (
            <div className="bg-muted/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-foreground">
                Creating profile for <span className="font-semibold">{dependentName}</span>
                <span className="text-muted-foreground"> · {dependentRelationship}</span>
              </p>
            </div>
          )}

          <KeyRound className="w-8 h-8 text-primary" />

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your fusion onQ password"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Enter the password you use for fusion onQ to confirm you're the guardian of this profile.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          className="w-full h-11 mt-6"
          disabled={!password.trim() || loading}
          onClick={() => {
            setError("");
            setLoading(true);
            base44.functions.invoke("fusionSignIn", { mobile, password })
              .then((res) => {
                setLoading(false);
                if (res.data && res.data.result) {
                  setStep("fusion_pending");
                } else {
                  setError(res.data?.reason || "Invalid password");
                }
              })
              .catch((e) => {
                setError(e?.response?.data?.error || e?.message || "Could not sign in.");
                setLoading(false);
              });
          }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify Password"}
        </Button>
      </FlowShell>
    );
  }

  // ── Step: SMS one-time code (no fusion password set) ──
  if (step === "otp") {
    return (
      <FlowShell
        onBack={() => { setStep("identity"); setOtp(""); setError(""); }}
        title="Verify Your Identity"
        subtitle={`Step ${parseInt(stepNum) + 1} of ${totalSteps} — Enter your code`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We've sent a one-time code via SMS to <span className="font-medium text-foreground">{mobile}</span>. Enter it below to confirm you're the guardian.
          </p>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider block">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-xl"
            />
          </div>
          <button
            onClick={() => { setStep("identity"); setOtp(""); }}
            className="text-xs text-primary font-medium hover:underline"
          >
            Change contact details
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button
          className="w-full h-11 mt-6"
          disabled={otp.length < 4 || loading}
          onClick={() => {
            setError("");
            setLoading(true);
            base44.functions.invoke("fusionVerifyOtp", { mobile, code: otp, signin: !isNewUser })
              .then((res) => {
                setLoading(false);
                if (res.data && res.data.result) {
                  if (isNewUser) {
                    setStep("register");
                  } else {
                    setStep("fusion_pending");
                  }
                } else {
                  setError(res.data?.reason || "Invalid OTP code");
                }
              })
              .catch((e) => {
                setError(e?.response?.data?.error || e?.message || "Could not verify the code.");
                setLoading(false);
              });
          }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : "Verify Code"}
        </Button>
      </FlowShell>
    );
  }

  // ── Step: Register a new guardian fusion onQ account (verified, not yet on fusion) ──
  if (step === "register") {
    return (
      <FlowShell
        onBack={() => setStep("otp")}
        title="Create your fusion onQ account"
        subtitle={`Step ${parseInt(stepNum) + 1} of ${totalSteps} — Guardian verification`}
      >
        <FusionRegisterForm
          mobile={mobile}
          onRegistered={async (user) => {
            if (profileType === "self") {
              // Map the new fusion user to a new ICE profile and log them in
              await routeAfterFusionAuth(user);
            } else {
              // Guardian registered — continue with the dependent profile setup
              setStep("fusion_pending");
            }
          }}
        />
      </FlowShell>
    );
  }

  // ── Step 4: Fusion Handshake Pending — NO ICE record created here ──
  if (step === "fusion_pending") {
    return (
      <FlowShell onBack={() => { setStep("identity"); setError(""); }} title="Linking to fusion onQ" subtitle="Final step — Account setup">
        <div className="space-y-5">
          {profileType === "dependent" && (
            <div className="bg-muted/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-foreground">
                Creating profile for <span className="font-semibold">{dependentName}</span>
                <span className="text-muted-foreground"> · {dependentRelationship}</span>
              </p>
            </div>
          )}

          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3 text-center">
            <CheckCircle className="w-10 h-10 text-primary mx-auto" />
            <p className="font-semibold text-foreground">Identity Verified</p>
            <p className="text-sm text-muted-foreground">
              {profileType === "dependent"
                ? `Your identity as guardian has been confirmed. We are now creating a fusion onQ profile for ${dependentName} and linking it to your account.`
                : "Your identity has been confirmed. We are now linking your account with fusion onQ to obtain your unique fusion ID."}
            </p>
            <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              {profileType === "dependent"
                ? `${dependentName} will appear as a managed profile in your ICE dashboard.`
                : "If you are new to fusion onQ, a new profile will be created for you automatically."}
            </p>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <p className="text-xs text-warning font-semibold uppercase tracking-wider mb-1">Awaiting fusion onQ</p>
            <p className="text-xs text-muted-foreground">
              The fusion integration is pending configuration. Once connected, this step will automatically resolve the fusion ID and create the ICE profile.
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full h-11 mt-6 gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to Start
        </Button>
      </FlowShell>
    );
  }

  return null;
}

// ── Shared shell ──────────────────────────────────────────────────────────────
function FlowShell({ onBack, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{subtitle}</p>}
        </div>
        <div className="flex-1">{children}</div>
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 max-w-lg mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    </div>
  );
}