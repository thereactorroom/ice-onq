import { User } from "lucide-react";
import ICEStatusBadge from "./ICEStatusBadge";

export default function ProfileHeader({ user, profile, contacts, allergies, conditions, medications, isOwner, onNavigateEdit }) {
  const dob = profile?.date_of_birth;
  const age = dob ? Math.floor((new Date() - new Date(dob)) / 31557600000) : null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-foreground">
        {profile?.display_name || user?.full_name || "Your Name"}
      </h2>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-full bg-muted border-2 border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
          {profile?.profile_photo ? (
            <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground flex-1">
          {dob && <span>DOB: {new Date(dob).toLocaleDateString()}</span>}
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