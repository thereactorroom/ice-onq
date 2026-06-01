import { useRef } from "react";
import { toast } from "sonner";
import { Shield, User, Download } from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";

export default function WalletCardPreview({ user, profile, primaryContact }) {
  const cardRef = useRef(null);

  async function handleDownload() {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null });
    const dataUrl = canvas.toDataURL("image/png");
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS Safari doesn't support anchor downloads — open in new tab for long-press save
      const win = window.open();
      if (win) {
        win.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:100%;height:auto" /><p style="font-family:sans-serif;text-align:center;color:#aaa;padding:16px">Long-press the image and tap "Save to Photos" or "Add to Photos"</p></body></html>`);
        win.document.close();
      }
    } else {
      // Android, desktop web — anchor download works
      const link = document.createElement("a");
      link.download = `ICE-Card-${(user?.full_name || "profile").replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.success("Download ready!");
  }

  const dob = profile?.date_of_birth;
  const qrData = encodeURIComponent(`${window.location.origin}/emergency?id=${profile?.id || ''}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&color=0F172A&bgcolor=FFFFFF`;

  return (
    <div className="w-full max-w-sm mx-auto space-y-3">
      <div ref={cardRef} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-slate-700 text-white p-6 shadow-2xl">
        <div className="relative flex flex-col gap-4 z-10">

          {/* Top row: branding + blood group on left, QR on right */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emergency flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold tracking-widest">ICE onQ</p>
                  <p className="text-[9px] opacity-60">In Case of Emergency</p>
                </div>
              </div>
              {profile?.blood_group && profile.blood_group !== "Unknown" && (
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#fca5a5', lineHeight: '1' }}>Blood: {profile.blood_group}</p>
              )}
            </div>
            <div className="rounded-lg overflow-hidden bg-white p-1">
              <img src={qrUrl} alt="QR Code" className="w-14 h-14" />
            </div>
          </div>

          {/* Bottom row: profile info + emergency contact */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {profile?.profile_photo ? (
                    <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white/60" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-5">{user?.full_name || "Your Name"}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">
                    {dob && <>DOB: {new Date(dob).toLocaleDateString()}</>}
                  </p>
                </div>
              </div>
              {profile?.critical_alerts?.length > 0 && (
                <p className="text-[10px] opacity-80 mt-1 leading-relaxed">
                  ⚠ {profile.critical_alerts.join(" · ")}
                </p>
              )}
            </div>
            {primaryContact && (
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] uppercase tracking-wider opacity-50 mb-0.5">Emergency Contact</p>
                <p className="text-xs font-semibold">{primaryContact.full_name}</p>
                <p className="text-[11px] font-mono opacity-80">{primaryContact.mobile}</p>
              </div>
            )}
          </div>

        </div>
      </div>
      <Button onClick={handleDownload} variant="outline" className="w-full gap-2">
        <Download className="w-4 h-4" /> Download Card as Image
      </Button>
    </div>
  );
}