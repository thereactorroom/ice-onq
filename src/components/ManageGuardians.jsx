import { useState, useEffect } from "react";
import { Users, Mail, Plus, CheckCircle, Clock, Trash2, X, Loader2, Shield, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function ManageGuardians({ dependentProfileId, dependentName, inviterFusionId, inviterName, onClose }) {
  const [guardians, setGuardians] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendTarget, setResendTarget] = useState(null);
  const [resending, setResending] = useState(false);

  function formatInviteDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  }

  async function load() {
    setLoading(true);
    const res = await base44.functions.invoke("getGuardianInvites", { dependentProfileId });
    setGuardians(res.data.dependentGuardians || []);
    setInvites(res.data.dependentInvites || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [dependentProfileId]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      await base44.functions.invoke("inviteGuardian", {
        dependentProfileId,
        inviteeEmail: inviteEmail.trim(),
        inviterFusionId,
        inviterName,
        appUrl: window.location.origin,
      });
      setSuccess(`Invite sent to ${inviteEmail.trim()}.`);
      setInviteEmail("");
      load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not send invite.");
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (!resendTarget) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      await base44.entities.GuardianInvite.delete(resendTarget.id);
      await base44.functions.invoke("inviteGuardian", {
        dependentProfileId,
        inviteeEmail: resendTarget.invitee_email,
        inviterFusionId,
        inviterName,
        appUrl: window.location.origin,
      });
      setSuccess(`Invite resent to ${resendTarget.invitee_email}.`);
      setResendTarget(null);
      load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not resend invite.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pt-4 pb-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-foreground text-sm">Co-Guardians</h3>
              <p className="text-xs text-muted-foreground">{dependentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Invite form */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground">Invite a Co-Guardian</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter their email address. They'll receive an invite to join as a co-guardian and will need a fusion onQ account to accept.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()} size="sm" className="gap-1.5 shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Invite
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && <p className="text-xs text-success">{success}</p>}
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Active co-guardians */}
              {guardians.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Co-Guardians</p>
                  {guardians.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20">
                      <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-4 h-4 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{g.guardian_name || "Co-Guardian"}</p>
                        <p className="text-xs text-muted-foreground truncate">{g.guardian_email}</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}

              {/* Pending invites */}
              {invites.filter(i => i.status === "pending").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Invites</p>
                  {invites.filter(i => i.status === "pending").map((inv) => (
                    <button
                      key={inv.id}
                      onClick={() => setResendTarget(inv)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 hover:scale-[1.01] transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{inv.invitee_email}</p>
                        <p className="text-xs text-muted-foreground">Sent {formatInviteDate(inv.created_date)}</p>
                      </div>
                      <Send className="w-4 h-4 text-warning flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {guardians.length === 0 && invites.filter(i => i.status === "pending").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No co-guardians yet. Invite someone above.</p>
              )}
            </>
          )}
        </div>
      </div>

        {/* Resend confirmation */}
        {resendTarget && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-sm">Resend Invite?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Would you like to resend the invite email to <span className="font-semibold text-foreground">{resendTarget.invitee_email}</span>?
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setResendTarget(null)} disabled={resending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleResend} disabled={resending} className="gap-1.5">
                  {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Resend
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}