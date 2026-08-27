import { useState, useEffect } from "react";
import { Settings, Save, Loader2, CheckCircle, AlertTriangle, MessageCircle, MessageSquare, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const DEFAULT_WHATSAPP = `Hi, I'm inviting you to be a co-guardian of [Name]'s ICE profile in Health onQ.

As a co-guardian, you will be able to help manage and keep [Name]'s emergency information up to date.

Please use the link below to download fusion onQ and register:
https://link.fusiononq.com

Once registered, open Health onQ and accept the co-guardian invitation using this link:
[AcceptLink]

Please let me know if you have any difficulty.`;

const DEFAULT_SMS = `Hi, I'm inviting you as a co-guardian of [Name]'s ICE profile. Download fusion onQ, register, then open Health onQ to accept: [AcceptLink]`;

const SAMPLE_NAME = "John";
const SAMPLE_LINK = "https://ice.onq.life/profile?acceptInvite=abc123";

export default function ICESetup() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [recordId, setRecordId] = useState(null);
  const [whatsappTemplate, setWhatsappTemplate] = useState(DEFAULT_WHATSAPP);
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [smsSender, setSmsSender] = useState("");

  useEffect(() => {
    base44.entities.ICESetup.list()
      .then((records) => {
        if (records.length > 0) {
          const r = records[0];
          setRecordId(r.id);
          if (r.whatsapp_template) setWhatsappTemplate(r.whatsapp_template);
          if (r.sms_template) setSmsTemplate(r.sms_template);
          setSmsEnabled(!!r.sms_enabled);
          if (r.sms_provider) setSmsProvider(r.sms_provider);
          if (r.sms_sender) setSmsSender(r.sms_sender);
        }
        setLoading(false);
      })
      .catch((e) => {
        // Non-admins get a 403 — show a friendly message
        setError(e?.response?.data?.error || e?.message || "Could not load settings.");
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const payload = {
        whatsapp_template: whatsappTemplate,
        sms_template: smsTemplate,
        sms_enabled: smsEnabled,
        sms_provider: smsProvider,
        sms_sender: smsSender,
      };
      if (recordId) {
        await base44.entities.ICESetup.update(recordId, payload);
      } else {
        const created = await base44.entities.ICESetup.create(payload);
        setRecordId(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  function preview(text) {
    return (text || "")
      .replaceAll("[Name]", SAMPLE_NAME)
      .replaceAll("[AcceptLink]", SAMPLE_LINK);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Non-admin guard — the entity RLS blocks non-admins, surfaced as an error
  if (error && !recordId) {
    return (
      <div className="max-w-2xl mx-auto py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Admin Access Required</h2>
        <p className="text-sm text-muted-foreground mt-1">ICE Set-Up is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">ICE Set-Up</h1>
          <p className="text-sm text-muted-foreground">Configure co-guardian invitation messages and SMS gateway.</p>
        </div>
      </div>

      {/* WhatsApp template */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-success" />
          <h2 className="font-bold text-foreground text-sm">WhatsApp Invitation Template</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 rounded text-[11px]">[Name]</code> for the dependent's name and <code className="bg-muted px-1 rounded text-[11px]">[AcceptLink]</code> for the acceptance link.
        </p>
        <textarea
          value={whatsappTemplate}
          onChange={(e) => setWhatsappTemplate(e.target.value)}
          rows={9}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-y"
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Preview</p>
          <pre className="text-xs text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap font-sans border border-border">{preview(whatsappTemplate)}</pre>
        </div>
      </div>

      {/* SMS template */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-foreground text-sm">SMS Invitation Template</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Keep it concise. Same placeholders: <code className="bg-muted px-1 rounded text-[11px]">[Name]</code> and <code className="bg-muted px-1 rounded text-[11px]">[AcceptLink]</code>.
        </p>
        <textarea
          value={smsTemplate}
          onChange={(e) => setSmsTemplate(e.target.value)}
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-y"
        />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Preview</p>
          <pre className="text-xs text-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap font-sans border border-border">{preview(smsTemplate)}</pre>
        </div>
      </div>

      {/* SMS Gateway (provisioned) */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-bold text-foreground text-sm">SMS Gateway</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-warning bg-warning/10 px-2 py-0.5 rounded-full">Provisioned</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Automated SMS sending is provisioned for a future release. WhatsApp is the active channel today. When you're ready to enable the SMS gateway, toggle it on here — API credentials are configured securely as app secrets.
        </p>
        <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
          <div>
            <p className="text-sm font-semibold text-foreground">Enable SMS Gateway</p>
            <p className="text-xs text-muted-foreground">Turn on once credentials are configured</p>
          </div>
          <button
            type="button"
            onClick={() => setSmsEnabled((v) => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${smsEnabled ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${smsEnabled ? "translate-x-6" : ""}`} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Provider</label>
            <select
              value={smsProvider}
              onChange={(e) => setSmsProvider(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="twilio">Twilio</option>
              <option value="messagebird">MessageBird</option>
              <option value="africas_talking">Africa's Talking</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Sender ID / Number</label>
            <input
              type="text"
              value={smsSender}
              onChange={(e) => setSmsSender(e.target.value)}
              placeholder="e.g. +27123456789"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle className="w-4 h-4" /> Saved
          </span>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}