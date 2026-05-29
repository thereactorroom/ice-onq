import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, Plus, Pencil, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryString } from "@/hooks/useQueryString";
import ProfileHeader from "../components/ProfileHeader";
import CriticalAlertsBanner from "../components/CriticalAlertsBanner";
import ContactCard from "../components/ContactCard";
import MedicalInfoDisplay from "../components/MedicalInfoDisplay";
import DoctorHospitalInfo from "../components/DoctorHospitalInfo";

const HERO_IMG = "https://media.base44.com/images/public/6a19919636ff0cb3ba316242/20083dd98_generated_image.png";

export default function Dashboard() {
  const queryString = useQueryString();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: profiles = [], isLoading: lp } = useQuery({
    queryKey: ["iceProfile", user?.email],
    queryFn: () => base44.entities.ICEProfile.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });
  const profile = profiles[0];
  const { data: contacts = [], isLoading: lc } = useQuery({
    queryKey: ["iceContacts", user?.email],
    queryFn: () => base44.entities.ICEContact.filter({ created_by: user.email }, "priority", 20),
    enabled: !!user?.email,
  });
  const { data: allergies = [] } = useQuery({
    queryKey: ["allergies", user?.email],
    queryFn: () => base44.entities.Allergy.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });
  const { data: conditions = [] } = useQuery({
    queryKey: ["conditions", user?.email],
    queryFn: () => base44.entities.ChronicCondition.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["medications", user?.email],
    queryFn: () => base44.entities.Medication.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const loading = lp || lc;
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });
  const primaryContact = sortedContacts.find((c) => c.is_primary) || sortedContacts[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <img src={HERO_IMG} alt="ICE onQ" className="w-48 h-48 object-contain mb-6 rounded-2xl" />
        <div className="w-14 h-14 rounded-2xl bg-emergency/10 flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-emergency" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Overview</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Your emergency lifeline. Set up your ICE profile so responders can access your critical medical information when it matters most.
        </p>
        <div className="flex gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to={`/medical${queryString}`}><Plus className="w-4 h-4" /> Create ICE Profile</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to={`/contacts${queryString}`}><Plus className="w-4 h-4" /> Add Contacts</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProfileHeader user={user} profile={profile} contacts={contacts} allergies={allergies} conditions={conditions} medications={medications} />

      <CriticalAlertsBanner alerts={profile.critical_alerts} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Emergency Contacts</h3>
          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" asChild>
            <Link to={`/contacts${queryString}`}><Pencil className="w-3.5 h-3.5" /> Manage</Link>
          </Button>
        </div>
        {sortedContacts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-muted-foreground text-sm mb-3">No emergency contacts yet</p>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/contacts${queryString}`} className="gap-1"><Plus className="w-3.5 h-3.5" /> Add Contact</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sortedContacts.map((c) => (
              <ContactCard key={c.id} contact={c} userName={user?.full_name} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Medical Information</h3>
          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" asChild>
            <Link to={`/medical${queryString}`}><Pencil className="w-3.5 h-3.5" /> Edit</Link>
          </Button>
        </div>
        <MedicalInfoDisplay allergies={allergies} conditions={conditions} medications={medications} />
      </div>

      <DoctorHospitalInfo profile={profile} />

      {profile.emergency_notes && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="font-semibold text-foreground text-sm mb-2">Emergency Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.emergency_notes}</p>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>Created: {new Date(profile.created_date).toLocaleDateString()}</span>
          <span>·</span>
          <span>Updated: {new Date(profile.updated_date).toLocaleDateString()}</span>
          {profile.last_reviewed_date && (
            <>
              <span>·</span>
              <span>Reviewed: {new Date(profile.last_reviewed_date).toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}