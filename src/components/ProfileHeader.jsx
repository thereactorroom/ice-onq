import { useState } from "react";
import { User, ZoomIn } from "lucide-react";
import ICEStatusBadge from "./ICEStatusBadge";

function photoAge(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const years = (new Date() - d) / 31557600000;
  if (years < 1) return "< 1 year ago";
  return `${Math.floor(years)}Y ago`;
}

function formatDob(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export default function ProfileHeader({ user, profile, contacts, allergies, conditions, medications, isOwner, onNavigateEdit, profileDbId, onProfileUpdated }) {
  const dob = profile?.date_of_birth;
  const age = dob ? Math.floor((new Date() - new Date(dob)) / 31557600000) : null;
  const [enlarged, setEnlarged] = useState(false);

  const photoLabel = photoAge(profile?.profile_photo_updated);

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
      {/* Enlarged photo overlay */}
      {enlarged && profile?.profile_photo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setEnlarged(false)}
        >
          <img
            src={profile.profile_photo}
            alt={profile?.display_name || "Profile photo"}
            className="w-80 h-80 rounded-2xl object-cover shadow-2xl border-4 border-white"
          />
        </div>
      )}

      <h2 className="text-lg font-bold text-foreground">
        {profile?.display_name || user?.full_name || "Your Name"}
      </h2>
      <div className="flex items-center gap-3">
        {/* Photo + date label + button */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className={`relative w-16 h-16 ${profile?.profile_photo ? "cursor-pointer" : ""}`}
            onClick={() => profile?.profile_photo && setEnlarged(true)}
            title={profile?.profile_photo ? "Tap to enlarge" : undefined}
          >
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
              {profile?.profile_photo ? (
                <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-7 h-7 text-muted-foreground" />
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
              <ZoomIn className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className={`text-[9px] font-medium leading-none ${photoLabel ? "text-muted-foreground" : "text-warning"}`}>
            {photoLabel ? `Last Updated ${photoLabel}` : "No photo date"}
          </span>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {dob && <span>DOB: {formatDob(dob)}</span>}
            {age !== null && <span>Age: {age}</span>}
          </div>
          <div className="flex items-center gap-2">
            {profile?.blood_group && profile.blood_group !== "Unknown" && (
              <span className="px-2 py-0.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold">
                {profile.blood_group}
              </span>
            )}
            <ICEStatusBadge profile={profile} contacts={contacts} allergies={allergies} conditions={conditions} medications={medications} isOwner={isOwner} onNavigateEdit={onNavigateEdit} />
          </div>
        </div>
      </div>
    </div>
  );
}