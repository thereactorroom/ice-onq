import { useState, useEffect } from "react";
import {
  Shield, Loader2, KeyRound, MessageSquare, CheckCircle, User, Link2,
  AlertCircle, QrCode, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import FusionRegisterForm from "./FusionRegisterForm";

// Steps: 'mobile' → (fusion userCheck) → 'password' | 'otp' | 'register'
//        → 'name' → 'checking' → 'profiles' (multiple) | 'confirm' (single/new)
//        → 'success' | 'claimed' | 'declined'
export default function ClaimQRCodeFlow({ qrToken, onStepChange }) {
  const [step, setStep] = useState("mobile");

  // Notify the parent whenever the flow step changes, so it can hide its
  // stale "No Emergency Information Linked" header once linking succeeds.
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [fusionUser, setFusionUser] = useState(null);
  const [fid, setFid] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [claimInfo, setClaimInfo] = useState(null);
  const [linkName, setLinkName] = useState("");

  // ── Verify the mobile number against fusion onQ ──
  function handleUserCheck() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionUserCheck", { mobile })
      .then(async (res) => {
        const data = res.data;
        if (data && data.result && data.user) {
          setIsNewUser(false);
          setFusionUser(data.user);
          setFid(String(data.user.userId));
          if (String(data.user.hasPassword) === "true") {
            setLoading(false);
            setStep("password");
          } else {
            const otpRes = await base44.functions.invoke("fusionSendOtp", { mobile });
            setLoading(false);
            if (!otpRes.data || !otpRes.data.result) {
              setError(otpRes.data?.reason || "Could not send the one-time code.");
              return;
            }
            setStep("otp");
          }
        } else {
          // Not registered on fusion yet — verify via OTP, then in-app registration
          setIsNewUser(true);
          const otpRes = await base44.functions.invoke("fusionSendOtp", { mobile });
          setLoading(false);
          if (!otpRes.data || !otpRes.data.result) {
            setError(otpRes.data?.reason || "Could not send the one-time code.");
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

  // ── Verify the fusion onQ password ──
  function handlePasswordSignIn() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionSignIn", { mobile, password })
      .then((res) => {
        const data = res.data;
        if (!data || !data.result || !data.user) {
          setError(data?.reason || "Invalid password");
          setLoading(false);
          return;
        }
        setFusionUser(data.user);
        setLoading(false);
        setStep("name");
      })
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Could not sign in.");
        setLoading(false);
      });
  }

  // ── Verify the SMS one-time code ──
  function handleVerifyOtp() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionVerifyOtp", { mobile, code: otp, signin: !isNewUser })
      .then((res) => {
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
        setLoading(false);
        setStep("name");
      })
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Could not verify the code.");
        setLoading(false);
      });
  }

  // ── After verification: find the user's ICE profiles and offer to link ──
  async function afterAuth(user) {
    const u = user || fusionUser;
    const myFid = String(u.userId);
    setFid(myFid);
    setLoading(true);
    setStep("checking");

    let exists = false;
    try {
      const check = await base44.functions.invoke("checkProfileExists", { id: myFid });
      exists = !!check.data?.exists;
    } catch { /* fall through */ }

    // Dependents this user created + profiles shared with them
    let dependents = [];
    let shared = [];
    try {
      const invRes = await base44.functions.invoke("getGuardianInvites", { fusionId: myFid });
      dependents = invRes.data?.dependentProfiles || [];
      shared = invRes.data?.sharedProfiles || [];
    } catch { /* fall through */ }

    let list = [
      ...dependents.map((p) => toCandidate(p, p.dependent_relationship || "Dependent")),
      ...shared.map((p) => toCandidate(p, "Shared with me")),
    ];

    if (exists) {
      try {
        const primRes = await base44.functions.invoke("getPublicICEProfile", {
          profileId: myFid,
          fusionUser: { userId: myFid },
          fusionHost: window.location.origin,
        });
        const prim = primRes.data?.profile;
        if (prim) list = [toCandidate(prim, "Your personal ICE record"), ...list];
      } catch { /* fall through */ }
    }

    // No ICE profile yet — create the shell, then offer to link the QR to it
    if (list.length === 0) {
      setIsNewProfile(true);
      try {
        const res = await base44.functions.invoke("getPublicICEProfile", {
          profileId: myFid,
          fusionUser: { userId: u.userId, name: u.name, surname: u.surname, dob: u.dob, picture: u.picture },
          fusionHost: window.location.origin,
        });
        const p = res.data?.profile;
        if (p) list = [toCandidate(p, "Your new ICE profile")];
      } catch { /* fall through */ }
    }

    setLoading(false);
    if (list.length === 0) {
      setError("Could not load your ICE profiles. Please try again.");
      setStep("mobile");
      return;
    }
    setCandidates(list);
    if (list.length === 1) {
      setSelected(list[0]);
      setStep("confirm");
    } else {
      setStep("profiles");
    }
  }

  function toCandidate(p, subtitle) {
    return {
      id: p.id,
      name: p.display_name || "My Profile",
      subtitle,
      photo: p.profile_photo,
      fID: p.fusion_id || p.id,
      isDbId: !p.fusion_id,
    };
  }

  // ── Link the QR token to the chosen profile ──
  async function linkTo(candidate) {
    setError("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageQRCode", {
        action: "link",
        qrToken,
        profileId: candidate.id,
        linkName: linkName.trim() || "Linked QR Code",
        fusionUserId: fid,
      });
      const d = res.data;
      if (d?.status === "linked" || d?.status === "already_linked") {
        setSelected(candidate);
        setStep("success");
      } else if (d?.status === "claimed") {
        setClaimInfo({ ownerName: d.ownerName || "Another profile" });
        setStep("claimed");
      } else {
        setError(d?.error || "Could not link this QR code.");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not link this QR code.");
    } finally {
      setLoading(false);
    }
  }

  function goToProfile(candidate) {
    const c = candidate || selected;
    const dbIdParam = c.isDbId ? "&isDbId=true" : "";
    const newParam = isNewProfile ? "&newProfile=true" : "";
    window.location.href =
      `/profile?fID=${c.fID}&Launch=View&Owner=True&guardianFid=${fid}${dbIdParam}${newParam}`;
  }

  // ── Step: name the QR code (optional, before profile choice) ──
  if (step === "name") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1">
          <QrCode className="w-7 h-7 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Name this QR code</h2>
          <p className="text-sm text-muted-foreground">
            Give this QR code a label so you can recognise it later — for example where you'll place it.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name (optional)</label>
          <input
            type="text"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="e.g. Helmet, Wallet, Bike"
            className="w-full bg-background border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full h-11" disabled={loading} onClick={() => afterAuth()}>
          {loading ? "Checking…" : "Continue"}
        </Button>
        <BackLink onBack={() => { setStep("mobile"); setError(""); }} />
      </div>
    );
  }

  // ── Step: checking profiles ──
  if (step === "checking") {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-3 text-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Checking your ICE profiles…</p>
      </div>
    );
  }

  // ── Step: mobile entry ──
  if (step === "mobile") {
    return (
      <div className="bg-card rounded-2xl border border-primary/25 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-sm">Is this your QR code?</h2>
            <p className="text-xs text-muted-foreground">
              Enter your mobile number and we'll check if you have an ICE profile, then link this QR code to it.
            </p>
          </div>
        </div>
        <input
          type="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="+27 82 000 0000"
          className="w-full bg-background border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full h-11" disabled={!mobile.trim() || loading} onClick={handleUserCheck}>
          {loading ? "Checking…" : "Continue"}
        </Button>
      </div>
    );
  }

  // ── Step: fusion onQ password ──
  if (step === "password") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1">
          <KeyRound className="w-7 h-7 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Enter your fusion onQ password</h2>
          <p className="text-sm text-muted-foreground">
            Welcome back{fusionUser?.name ? `, ${fusionUser.name}` : ""}. Enter the password you use for fusion onQ.
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your fusion onQ password"
          className="w-full bg-background border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full h-11" disabled={!password.trim() || loading} onClick={handlePasswordSignIn}>
          {loading ? "Signing In…" : "Sign In"}
        </Button>
        <BackLink onBack={() => { setStep("mobile"); setError(""); }} />
      </div>
    );
  }

  // ── Step: SMS one-time code ──
  if (step === "otp") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1">
          <MessageSquare className="w-7 h-7 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Verify with a one-time code</h2>
          <p className="text-sm text-muted-foreground">
            We've sent a one-time code via SMS to <span className="font-semibold text-foreground">{mobile}</span>.
          </p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="w-full bg-background border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest text-center text-lg"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full h-11" disabled={otp.length < 4 || loading} onClick={handleVerifyOtp}>
          {loading ? "Verifying…" : "Verify"}
        </Button>
        <BackLink onBack={() => { setStep("mobile"); setError(""); }} />
      </div>
    );
  }

  // ── Step: register a new fusion onQ account ──
  if (step === "register") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="space-y-1">
          <Shield className="w-7 h-7 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Create your fusion onQ account</h2>
          <p className="text-sm text-muted-foreground">
            Your number isn't on fusion onQ yet. Create your account — we'll set up your ICE profile and link this QR code.
          </p>
        </div>
        <FusionRegisterForm mobile={mobile} onRegistered={(user) => { setFusionUser(user); setStep("name"); }} />
        <BackLink onBack={() => { setStep("mobile"); setError(""); }} />
      </div>
    );
  }

  // ── Step: choose which profile to link (multiple profiles) ──
  if (step === "profiles") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1">
          <QrCode className="w-7 h-7 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Link this QR code to…</h2>
          <p className="text-sm text-muted-foreground">
            You have more than one ICE profile. Choose which one this QR code should open when scanned.
          </p>
        </div>
        <div className="space-y-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              disabled={loading}
              onClick={() => linkTo(c)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.photo
                  ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                  : <User className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.subtitle}</p>
              </div>
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <BackLink onBack={() => { setStep("mobile"); setError(""); }} />
      </div>
    );
  }

  // ── Step: confirm linking (single or newly created profile) ──
  if (step === "confirm") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="space-y-1">
          <CheckCircle className="w-7 h-7 text-success" />
          <h2 className="text-lg font-bold text-foreground">
            {isNewProfile ? "Your ICE profile is ready" : "We found your ICE profile"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isNewProfile
              ? "We've created a new ICE profile for you. Would you like this QR code linked to it?"
              : `Would you like this QR code linked to ${selected?.name}?`}
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button className="w-full h-11 gap-2" disabled={loading} onClick={() => linkTo(selected)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {loading ? "Linking…" : "Yes, Link This QR Code"}
          </Button>
          <Button variant="outline" className="w-full h-11" disabled={loading} onClick={() => setStep("declined")}>
            Not Now
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: declined ──
  if (step === "declined") {
    return (
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4 text-center">
        <CheckCircle className="w-8 h-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">
          No problem — this QR code isn't linked yet. You can link it at any time from the
          <span className="font-semibold text-foreground"> Linked QR Codes</span> section of your ICE profile.
        </p>
        <Button className="w-full h-11" onClick={() => goToProfile()}>
          Go to My Profile
        </Button>
      </div>
    );
  }

  // ── Step: success ──
  if (step === "success") {
    return (
      <div className="bg-card rounded-2xl border border-success/30 p-6 space-y-4 text-center">
        <CheckCircle className="w-12 h-12 text-success mx-auto" />
        <h2 className="text-lg font-bold text-foreground">QR Code Linked</h2>
        <p className="text-sm text-muted-foreground">
          This QR code is now linked to <span className="font-semibold text-foreground">{selected?.name}</span>.
          Anyone scanning it will see the emergency information saved on that profile.
        </p>
        <Button className="w-full h-11" onClick={() => goToProfile()}>
          {isNewProfile ? "Set Up My Profile" : "View Profile"}
        </Button>
      </div>
    );
  }

  // ── Step: claimed by another profile ──
  if (step === "claimed") {
    return (
      <div className="bg-card rounded-2xl border border-warning/40 p-5 space-y-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            This QR code is already linked to <strong>{claimInfo?.ownerName}</strong>. A QR code can only be linked to one profile.
          </p>
        </div>
        <a
          href={`/profile?qrToken=${encodeURIComponent(qrToken || "")}`}
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold text-sm py-3 rounded-xl hover:bg-primary/90 transition-colors"
        >
          View That Profile
        </a>
        <BackLink onBack={() => { setStep("mobile"); setError(""); }} />
      </div>
    );
  }

  return null;
}

function BackLink({ onBack }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
    >
      ← Back
    </button>
  );
}