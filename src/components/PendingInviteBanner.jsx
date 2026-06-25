import { useState } from "react";
import { Users, CheckCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function PendingInviteBanner({ invite, acceptingFusionId, acceptingName, acceptingEmail, onAccepted }) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("acceptGuardianInvite", {
        token: invite.token,
        acceptingFusionId,
        acceptingName,
        acceptingEmail,
      });
      onAccepted(res.data);
    } catch (e) {
      console.error("Accept invite failed:", e);
      setLoading(false);
    }
  }

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Users className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Guardian Invite</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          <strong>{invite.inviter_name}</strong> has invited you to co-manage <strong>{invite.dependent_name}</strong>'s ICE profile.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={handleAccept} disabled={loading} className="gap-1.5 text-xs h-8">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} className="text-xs h-8">
            Dismiss
          </Button>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className="p-1 text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}