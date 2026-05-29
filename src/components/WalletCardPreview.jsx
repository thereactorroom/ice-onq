import { Shield, User } from "lucide-react";

export default function WalletCardPreview({ user, profile, primaryContact }) {
  const dob = profile?.date_of_birth;
  const qrData = encodeURIComponent(window.location.origin);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}&color=0F172A&bgcolor=FFFFFF`;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-slate-700 text-white p-6 shadow-2xl aspect-[1.6/1]">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-emergency flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-widest">ICE onQ</p>
                <p className="text-[9px] opacity-60">In Case of Emergency</p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden bg-white p-1">
              <img src={qrUrl} alt="QR Code" className="w-14 h-14" />
            </div>
          </div>

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
                  <p className="font-bold text-sm truncate">{user?.full_name || "Your Name"}</p>
                  {dob && <p className="text-[10px] opacity-70">DOB: {new Date(dob).toLocaleDateString()}</p>}
                </div>
              </div>

              {profile?.blood_group && profile.blood_group !== "Unknown" && (
                <span className="inline-block px-2 py-0.5 rounded bg-emergency/80 text-[10px] font-bold mb-1">
                  Blood: {profile.blood_group}
                </span>
              )}

              {profile?.critical_alerts?.length > 0 && (
                <p className="text-[10px] opacity-80 truncate mt-1">
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
    </div>
  );
}