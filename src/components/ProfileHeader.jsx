import { useState } from "react";
import { User, ZoomIn, RefreshCw } from "lucide-react";
import ICEStatusBadge from "./ICEStatusBadge";
import { base44 } from "@/api/base44Client";

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
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
  const [stamping, setStamping] = useState(false);

  const photoDate = formatDate(profile?.profile_photo_updated);

  async function handleMarkPhotoReviewed() {
    if (!profileDbId || !onProfileUpdated) return;
    setStamping(true);
    const now = new Date().toISOString();
    await base44.functions.invoke("updatePublicICEProfile", {
      profileId: profileDbId,
      updates: { profile_photo_updated: now },
    });
    onProfileUpdated({ profile_photo_updated: now });
    setStamping(false);
  }

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
          <span className={`text-[9px] font-medium leading-none ${photoDate ? "text-muted-foreground" : "text-warning"}`}>
            {photoDate || "No date"}
          </span>
          {isOwner && (
            <button
              onClick={handleMarkPhotoReviewed}
              disabled={stamping}
              title="Mark photo as reviewed"
              className="mt-0.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 text-[9px] font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${stamping ? "animate-spin" : ""}`} />
              {stamping ? "..." : "Refresh"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground flex-1">
          {dob && <span>DOB: {formatDob(dob)}</span>}
          {age !== null && <span>Age: {age}</span>}
          {profile?.blood_group && profile.blood_group !== "Unknown" && (
            <span className="px-2 py-0.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold">
              {profile.blood_group}
            </span>
          )}
        </div>
        <ICEStatusBadge profile={profile} contacts={contacts} allergies={allergies} conditions={conditions} medications={medications} isOwner={isOwner} onNavigateEdit={onNavigateEdit} />
      </div>
    </div>
  );
}