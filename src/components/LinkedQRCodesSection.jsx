import { useState, useEffect } from "react";
import { QrCode, Plus, Trash2, Loader2, Link2, AlertCircle, ShieldCheck, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Extracts a 32-char token from a raw token or a full URL.
function normalizeToken(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  const match = trimmed.match(/\/([A-Za-z0-9_-]{32})(?:[/?#]|$)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9_-]{32}$/.test(trimmed)) return trimmed;
  return null;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  } catch { return ""; }
}

export default function LinkedQRCodesSection({ profileDbId, fusionUserId }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [linkName, setLinkName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [claimedInfo, setClaimedInfo] = useState(null);
  const [unlinkTarget, setUnlinkTarget] = useState(null);
  const [unlinking, setUnlinking] = useState(false);

  function loadCodes() {
    if (!profileDbId) return;
    setLoading(true);
    base44.functions.invoke("manageQRCode", { action: "list", profileId: profileDbId, fusionUserId })
      .then((res) => { setCodes(res.data?.codes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadCodes(); }, [profileDbId]);

  async function handleLink() {
    const token = normalizeToken(tokenInput);
    if (!token) { setLinkError("Enter a valid 32-character QR token or the QR code URL."); return; }
    setSubmitting(true);
    setLinkError(null);
    setClaimedInfo(null);
    try {
      const res = await base44.functions.invoke("manageQRCode", {
        action: "link",
        qrToken: token,
        profileId: profileDbId,
        linkName: linkName || "Linked QR Code",
        fusionUserId,
      });
      const data = res.data;
      if (data?.status === "linked" || data?.status === "already_linked") {
        setShowLinkDialog(false);
        setTokenInput("");
        setLinkName("");
        loadCodes();
      } else if (data?.status === "claimed") {
        setClaimedInfo({ ownerName: data.ownerName, ownerProfileId: data.ownerProfileId, token });
      } else {
        setLinkError(data?.error || "Could not link this QR code.");
      }
    } catch (err) {
      setLinkError(err?.response?.data?.error || err?.message || "Could not link this QR code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlink() {
    if (!unlinkTarget) return;
    setUnlinking(true);
    try {
      await base44.functions.invoke("manageQRCode", {
        action: "unlink",
        linkedQrId: unlinkTarget.id,
        fusionUserId,
      });
      setUnlinkTarget(null);
      loadCodes();
    } catch (err) {
      setUnlinkTarget(null);
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-sm">Linked QR Codes</h3>
        </div>
        <button
          onClick={() => setShowLinkDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Link QR Code
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Scan or paste a QR code to link it to this profile. The primary ICE QR code cannot be removed.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${code.is_founding ? "bg-primary/10" : "bg-muted"}`}>
                {code.is_founding
                  ? <ShieldCheck className="w-4.5 h-4.5 text-primary" />
                  : <QrCode className="w-4.5 h-4.5 text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{code.link_name}</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{code.qr_token}</p>
                {code.linked_at && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Linked: {formatDate(code.linked_at)}</p>
                )}
              </div>
              {!code.is_founding && (
                <button
                  onClick={() => setUnlinkTarget(code)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  title="Delink QR code"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {code.is_founding && (
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">Primary</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link dialog */}
      <AlertDialog open={showLinkDialog} onOpenChange={(open) => {
        if (!open) { setShowLinkDialog(false); setLinkError(null); setClaimedInfo(null); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Link a QR Code</AlertDialogTitle>
            <AlertDialogDescription>
              Paste the QR code token or the full URL printed on the code. Then give it a name (e.g. "Helmet").
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!claimedInfo ? (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">QR Token or URL</label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="https://ice.onq.life/…  or  32-char token"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={linkName}
                  onChange={(e) => setLinkName(e.target.value)}
                  placeholder="e.g. Helmet, Wallet, Bike"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              {linkError && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{linkError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900">
                  This QR code has already been claimed by <strong>{claimedInfo.ownerName}</strong>. You can view their emergency profile instead.
                </p>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            {!claimedInfo ? (
              <>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleLink} disabled={submitting} className="gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Link QR Code
                </Button>
              </>
            ) : (
              <>
                <AlertDialogCancel>Close</AlertDialogCancel>
                <a
                  href={`/profile?qrToken=${encodeURIComponent(claimedInfo.token)}`}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
                >
                  <ExternalLink className="w-4 h-4" /> View Their Profile
                </a>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlink confirmation */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => { if (!open) setUnlinkTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delink this QR code?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{unlinkTarget?.link_name}</strong> will no longer open this ICE profile when scanned. The QR code itself is not affected and can be linked again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90 border-0">Cancel</AlertDialogCancel>
            <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" disabled={unlinking} onClick={handleUnlink}>
              {unlinking ? "Delinking..." : "Yes, Delink"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}