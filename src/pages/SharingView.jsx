import { useState } from "react";
import { QrCode, Smartphone, CreditCard, Copy, Check, Link, Download } from "lucide-react";
import WalletCardPreview from "../components/WalletCardPreview";

export default function SharingView({ profile, contacts, user, profileDbId }) {
  const [copied, setCopied] = useState(false);

  // Use public_slug for the share URL if available, otherwise fall back to DB id
  const shareUrl = profile?.public_slug
    ? `${window.location.origin}/profile?s=${profile.public_slug}`
    : profileDbId
      ? `${window.location.origin}/profile?fID=${profileDbId}&isDbId=true`
      : null;

  const sortedContacts = [...(contacts || [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  async function handleCopyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const qrUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}&color=0F172A&bgcolor=FFFFFF`
    : null;

  return (
    <div className="space-y-6">
      <WalletCardPreview profile={profile} contacts={sortedContacts} user={user} />

      {/* Copy Link */}
      {shareUrl && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Share Your ICE Profile</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this link and send it via WhatsApp, SMS, or email so emergency contacts always have quick access.
          </p>
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border font-medium text-sm transition-colors ${
              copied
                ? "bg-success/10 border-success/30 text-success"
                : "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent"
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <p className="text-[11px] text-muted-foreground truncate text-center">{shareUrl}</p>
        </div>
      )}

      {/* QR Code */}
      {qrUrl && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Emergency QR Code</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            This QR code links to your ICE onQ profile. Attach it to your phone case, cycling helmet, medical bracelet, or wallet.
          </p>
          <div className="flex justify-center py-2">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border flex flex-col items-center gap-2">
              <img src={qrUrl} alt="ICE QR Code" className="w-44 h-44" />
              <p className="text-sm font-semibold text-foreground text-center">{profile?.display_name || user?.full_name || ""}</p>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground">Scan to access emergency information</div>

          {/* Download QR — highlighted tile */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <p className="text-xs text-muted-foreground text-center">Download the QR code for printing and physical deployment</p>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(shareUrl)}&color=0F172A&bgcolor=FFFFFF`}
              download={`ICE-QR-${(profile?.display_name || user?.full_name || "profile").replace(/\s+/g, "-")}.png`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download QR Code
            </a>
          </div>
        </div>
      )}

      {/* Potential Uses */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-semibold">Potential Uses</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Smartphone, label: "Phone lock screen" },
            { icon: CreditCard, label: "Physical wallet card" },
            { icon: "🚴", label: "Cycling ID tag" },
            { icon: "🏃", label: "Running bib" },
            { icon: "🏥", label: "Medical bracelet" },
            { icon: "🚗", label: "Vehicle sticker" },
          ].map((use, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-sm">
              {typeof use.icon === "string" ? (
                <span className="text-lg">{use.icon}</span>
              ) : (
                <use.icon className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-foreground">{use.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/50 rounded-2xl p-5 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">Coming Soon</p>
        <p className="text-xs text-muted-foreground">Apple Wallet · Google Wallet · Printable Card · NFC Tag Support</p>
      </div>
    </div>
  );
}