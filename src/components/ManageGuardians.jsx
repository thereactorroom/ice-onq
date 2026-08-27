import { useState, useEffect } from "react";
import { Users, Phone, Plus, CheckCircle, Clock, Trash2, X, Loader2, Shield, Send, MessageCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { fusionWhatsApp, fusionSMS } from "@/lib/fusionBridge";

export default function ManageGuardians({ dependentProfileId, dependentName, inviterFusionId, inviterName, onClose }) {
  const [guardians, setGuardians] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteMobile, setInviteMobile] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Last prepared invite — lets the inviter fall back to SMS if WhatsApp isn't available
  const [lastInvite, setLastInvite] = useState(null); // { mobile, whatsappMessage, smsMessage }
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
    if (!inviteMobile.trim()) return;
    setSending(true);
    setError("");
    setSuccess("");
    setLastInvite(null);
    try {
      const res = await base44.functions.invoke("inviteGuardian", {
        dependentProfileId,
        inviteeMobile: inviteMobile.trim(),
        inviterFusionId,
        inviterName,
        appUrl: window.location.origin,
      });
      const data = res.data;
      setLastInvite({ mobile: data.mobile, whatsappMessage: data.whatsappMessage, smsMessage: data.smsMessage });
      setSuccess(`WhatsApp opened for ${data.mobile} — press send.`);
      setInviteMobile("");
      // Pre-populate WhatsApp (inviter presses send manually)
      fusionWhatsApp(data.mobile, data.whatsappMessage);
      load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not prepare invite.");
    } finally {
      setSending(false);
    }
  }

  function handleSmsFallback() {
    if (!lastInvite) return;
    fusionSMS(lastInvite.mobile, lastInvite.smsMessage);
    setSuccess(`SMS opened for ${lastInvite.mobile} — press send.`);
  }

  async function handleResend() {
    if (!resendTarget) return;
    setResending(true);
    setError("");
    setSuccess("");
    try {
      await base44.entities.GuardianInvite.delete(resendTarget.id);
      const res = await base44.functions.invoke("inviteGuardian", {
        dependentProfileId,
        inviteeMobile: resendTarget.invitee_mobile,
        inviterFusionId,
        inviterName,
        appUrl: window.location.origin,
      });
      const data = res.data;
      setLastInvite({ mobile: data.mobile, whatsappMessage: data.whatsappMessage, smsMessage: data.smsMessage });
      setSuccess(`WhatsApp opened for ${data.mobile} — press send.`);
      setResendTarget(null);
      fusionWhatsApp(data.mobile, data.whatsappMessage);
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
              Enter their mobile number. We'll open WhatsApp with the invitation pre-filled — just press send. If they're not on WhatsApp, send via SMS instead.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={inviteMobile}
                onChange={(e) => setInviteMobile(e.target.value)}
                placeholder="e.g. 082 123 4567"
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
              <Button onClick={handleInvite} disabled={sending || !inviteMobile.trim()} size="sm" className="gap-1.5 shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Invite
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && (
              <div className="space-y-2">
                <p className="text-xs text-success">{success}</p>
                {lastInvite && (
                  <button
                    onClick={handleSmsFallback}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-foreground/5 border border-border text-foreground text-xs font-semibold hover:bg-foreground/10 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Not on WhatsApp? Send via SMS instead
                  </button>
                )}
              </div>
            )}
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
                        <Phone className="w-4 h-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{inv.invitee_mobile || inv.invitee_email}</p>
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
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground text-sm">Resend Invite?</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Re-open WhatsApp with the invitation for <span className="font-semibold text-foreground">{resendTarget.invitee_mobile}</span>?
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