import { useState, useEffect } from "react";
import { Shield, User, Plus, ChevronRight, Loader2, AlertCircle, CheckCircle, Clock, MoreVertical, Trash2, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import AddDependentForm from "./AddDependentForm";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel
} from "@/components/ui/alert-dialog";

// Shown after sign-in when a user has (or may have) multiple managed profiles
export default function ProfileSelectorScreen({ guardianFid, onBack, onSelect }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [primaryProfile, setPrimaryProfile] = useState(null);
  const [showAddDependent, setShowAddDependent] = useState(false);
  const [manageProfile, setManageProfile] = useState(null); // { id, name } for delete dialog
  const [deleting, setDeleting] = useState(false);

  function loadProfiles() {
    setLoading(true);
    // Fetch primary profile and dependents in parallel
    Promise.all([
      base44.functions.invoke("getPublicICEProfile", {
        profileId: String(guardianFid),
        fusionUser: { userId: String(guardianFid) },
        fusionHost: window.location.origin,
      }),
      base44.entities.ICEProfile.filter({ guardian_fid: String(guardianFid), is_deleted: false }),
    ])
      .then(([primaryRes, dependents]) => {
        setPrimaryProfile(primaryRes.data?.profile || null);
        setProfiles(dependents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadProfiles(); }, [guardianFid]);

  if (showAddDependent) {
    return (
      <AddDependentForm
        guardianFid={guardianFid}
        onBack={() => setShowAddDependent(false)}
        onCreated={(newProfile) => {
          // Go directly to editing the new dependent profile (by DB id)
          onSelect({ fID: newProfile.id, owner: true, guardianFid, isDbId: true });
        }}
      />
    );
  }

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
              name={primaryProfile?.display_name || "My Profile"}
              subtitle="Your personal ICE record"
              photo={primaryProfile?.profile_photo}
              fid={guardianFid}
              isOwn
              statusBadge={statusBadge(primaryProfile)}
              onClick={() => onSelect({ fID: guardianFid, owner: true })}
              onManage={primaryProfile ? () => setManageProfile({ id: primaryProfile.id, name: primaryProfile.display_name || "My Profile" }) : undefined}
            />

            {/* Dependent profiles */}
            {profiles.map((p) => (
              <ProfileCard
                key={p.id}
                name={p.display_name || "Unnamed Dependent"}
                subtitle={p.dependent_relationship || "Dependent"}
                photo={p.profile_photo}
                statusBadge={statusBadge(p)}
                fusionPending={p.fusion_link_pending}
                onClick={() => onSelect({ fID: p.fusion_id || p.id, owner: true, guardianFid, isDbId: !p.fusion_id })}
                onManage={() => setManageProfile({ id: p.id, name: p.display_name || "Unnamed Dependent" })}
              />
            ))}

            {/* Add dependent CTA */}
            <button
              onClick={() => setShowAddDependent(true)}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!manageProfile} onOpenChange={(open) => { if (!open) setManageProfile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ICE Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate <strong>{manageProfile?.name}</strong>. Anyone scanning the QR code will see a "Profile Deleted" message. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-primary text-primary-foreground hover:bg-primary/90 border-0">Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await base44.functions.invoke("updatePublicICEProfile", {
                  profileId: manageProfile.id,
                  updates: { is_deleted: true, deleted_at: new Date().toISOString() },
                });
                setDeleting(false);
                setManageProfile(null);
                loadProfiles();
              }}
            >
              {deleting ? "Deleting..." : "Yes, Delete Profile"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

function ProfileCard({ name, subtitle, photo, isOwn, statusBadge, fusionPending, onClick, onManage }) {
  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors">
      <button onClick={onClick} className="flex items-center gap-4 flex-1 min-w-0 text-left">
        <div className="relative w-12 h-12 flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {photo
              ? <img src={photo} alt={name} className="w-full h-full object-cover" />
              : <User className="w-6 h-6 text-primary" />
            }
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
            <ZoomIn className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {statusBadge}
            {fusionPending && (
              <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> fusion link pending
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </button>
      {onManage && (
        <button
          onClick={(e) => { e.stopPropagation(); onManage(); }}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          title="Delete profile"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}