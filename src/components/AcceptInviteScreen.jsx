import { useState, useEffect } from "react";
import { Shield, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function AcceptInviteScreen({ token, fusionUser, authUser }) {
  const [status, setStatus] = useState("loading"); // loading | ready | accepting | accepted | error
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");

  // Derive the accepting user's details from either fusion context or auth
  const acceptingFusionId = fusionUser?.userId || authUser?.fusion_id || "";
  const acceptingName = fusionUser ? [fusionUser.name, fusionUser.surname].filter(Boolean).join(" ") : (authUser?.full_name || "");
  const acceptingEmail = fusionUser?.email || authUser?.email || "";

  useEffect(() => {
    // Preview the invite details before accepting
    base44.functions.invoke("getGuardianInvites", { email: acceptingEmail })
      .then((res) => {
        const pending = (res.data?.pendingInvites || []).find(i => i.token === token);
        if (pending) {
          setInvite(pending);
          setStatus("ready");
        } else {
          setStatus("error");
          setError("This invite has already been used or is no longer valid.");
        }
      })
      .catch(() => { setStatus("error"); setError("Could not load invite details."); });
  }, [token, acceptingEmail]);

  async function handleAccept() {
    if (!acceptingFusionId) {
      setError("You must be logged in with a fusion onQ account to accept this invite.");
      return;
    }
    setStatus("accepting");
    try {
      await base44.functions.invoke("acceptGuardianInvite", {
        token,
        acceptingFusionId: String(acceptingFusionId),
        acceptingName,
        acceptingEmail,
      });
      setStatus("accepted");
    } catch (e) {
      setStatus("error");
      setError(e?.response?.data?.error || e?.message || "Could not accept invite.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-white" />
          <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-16 flex flex-col items-center text-center gap-5">
        {status === "loading" && (
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        )}

        {status === "ready" && invite && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Guardian Invite</h2>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                <strong>{invite.inviter_name}</strong> has invited you to co-manage <strong>{invite.dependent_name}</strong>'s ICE emergency profile.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 w-full text-left space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">What this means</p>
              <ul className="text-sm text-foreground space-y-1.5">
                <li>✅ You can view {invite.dependent_name}'s emergency medical information</li>
                <li>✅ You can update their profile at any time</li>
                <li>✅ You can add further co-guardians</li>
              </ul>
            </div>
            {!acceptingFusionId && (
              <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2 text-left w-full">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">You need to be logged in with a fusion onQ account to accept. Please log in or register first.</p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleAccept} disabled={!acceptingFusionId} className="w-full gap-2 h-11">
              <CheckCircle className="w-4 h-4" />
              Accept & Become Co-Guardian
            </Button>
          </>
        )}

        {status === "accepting" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Linking your account...</p>
          </>
        )}

        {status === "accepted" && (
          <>
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">You're a co-guardian!</h2>
              <p className="text-muted-foreground text-sm mt-2">
                The profile now appears in your dashboard. You can view and update it at any time.
              </p>
            </div>
            <Button onClick={() => window.location.href = "/profile"} className="w-full h-11">
              Go to My Profiles
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Invite Unavailable</h2>
              <p className="text-muted-foreground text-sm mt-2">{error}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/profile"} className="w-full">
              Go to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}