import { useState, useEffect } from "react";
import { Shield, User, Plus, ChevronRight, Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

// Shown after sign-in when a user has (or may have) multiple managed profiles
export default function ProfileSelectorScreen({ guardianFid, onBack, onSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.functions.invoke("listManagedProfiles", { guardianFid })
      .then((res) => {
        setProfiles(res.data.profiles || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: if function doesn't exist yet, show just the primary profile slot
        setProfiles([]);
        setLoading(false);
      });
  }, [guardianFid]);

  function statusBadge(profile) {
    if (!profile) {
      return (
        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> Not Set Up
        </span>
      );
    }
    const hasData = profile.blood_group || profile.medical_aid_name || profile.doctor_name;
    if (hasData) {
      return (
        <span className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
        <AlertCircle className="w-3 h-3" /> Incomplete
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Shield className="w-6 h-6 text-white" />
          <div>
            <div className="font-bold text-white tracking-wider leading-none">ICE onQ</div>
            <div className="text-white/70 text-xs mt-0.5">Select a profile to manage</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Your ICE Profiles</h2>
          <p className="text-sm text-muted-foreground">Select a profile to view or manage.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary (self) profile slot — always shown */}
            <ProfileCard
              name="My Profile"
              subtitle="Your personal ICE record"
              fid={guardianFid}
              isOwn
              statusBadge={statusBadge(profiles.find(p => p.fusion_id === String(guardianFid) && !p.guardian_fid))}
              onClick={() => onSelect({ fID: guardianFid, owner: true })}
            />

            {/* Dependent profiles */}
            {profiles
              .filter(p => p.guardian_fid === String(guardianFid))
              .map((p) => (
                <ProfileCard
                  key={p.id}
                  name={p.display_name || "Unnamed Dependent"}
                  subtitle={p.dependent_relationship || "Dependent"}
                  fid={p.fusion_id}
                  statusBadge={statusBadge(p)}
                  onClick={() => onSelect({ fID: p.fusion_id, owner: true })}
                />
              ))}

            {/* Add dependent CTA */}
            <button
              onClick={() => onSelect({ addDependent: true, guardianFid })}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">Add a Dependent</p>
                <p className="text-xs text-muted-foreground">Register a child, elderly parent, or other dependent</p>
              </div>
            </button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Sticky back */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-3 max-w-lg mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

function ProfileCard({ name, subtitle, fid, isOwn, statusBadge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
    >
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <User className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        <div className="mt-1.5">{statusBadge}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </button>
  );
}