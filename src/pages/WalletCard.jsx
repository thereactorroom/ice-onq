import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CreditCard, Download, QrCode, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalletCardPreview from "../components/WalletCardPreview";

export default function WalletCard() {
  const search = new URLSearchParams(window.location.search).toString();
  const queryString = search ? `?${search}` : "";
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["iceProfile", user?.email],
    queryFn: () => base44.entities.ICEProfile.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });
  const profile = profiles[0];
  const { data: contacts = [] } = useQuery({
    queryKey: ["iceContacts", user?.email],
    queryFn: () => base44.entities.ICEContact.filter({ created_by: user.email }, "priority", 10),
    enabled: !!user?.email,
  });

  const sorted = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });
  const primaryContact = sorted[0];

  const qrUrl = profile ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/emergency?id=${profile.id}`)}&color=0F172A&bgcolor=FFFFFF` : null;

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">ICE Wallet Card</h2>
        <p className="text-sm text-muted-foreground">A compact emergency card you can screenshot or share</p>
      </div>

      <WalletCardPreview user={user} profile={profile} primaryContact={primaryContact} />

      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Emergency QR Code</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          This QR code links to your ICE onQ profile. Attach it to your phone case, cycling helmet, medical bracelet, or wallet.
        </p>
        <div className="flex justify-center py-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
            <img src={qrUrl} alt="ICE QR Code" className="w-40 h-40" />
          </div>
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Scan to access emergency information
        </div>
      </div>

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