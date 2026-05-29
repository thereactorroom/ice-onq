import { Stethoscope, Building2, CreditCard, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

function InfoCard({ icon: Icon, title, color, children, isEmpty }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">Not yet added</p>
      ) : children}
    </div>
  );
}

export default function DoctorHospitalInfo({ profile }) {
  if (!profile) return null;

  const docPhone = (profile.doctor_mobile || "").replace(/[^+\d]/g, "");

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <InfoCard icon={CreditCard} title="Medical Aid" color="bg-emerald-100 text-emerald-600" isEmpty={!profile.medical_aid_name}>
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">{profile.medical_aid_name}</p>
          <p className="text-muted-foreground">Member: {profile.medical_aid_number || "—"}</p>
          {profile.medical_aid_plan && <p className="text-muted-foreground">Plan: {profile.medical_aid_plan}</p>}
        </div>
      </InfoCard>

      <InfoCard icon={Stethoscope} title="Treating Doctor" color="bg-sky-100 text-sky-600" isEmpty={!profile.doctor_name}>
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">{profile.doctor_name}</p>
          {profile.doctor_practice && <p className="text-muted-foreground">{profile.doctor_practice}</p>}
          {profile.doctor_mobile && (
            <div className="pt-2">
              <Button size="sm" variant="outline" className="gap-1.5 text-success border-success/30" asChild>
                <a href={`tel:${docPhone}`}>
                  <Phone className="w-3.5 h-3.5" /> Call Doctor
                </a>
              </Button>
            </div>
          )}
        </div>
      </InfoCard>

      <InfoCard icon={Building2} title="Preferred Hospital" color="bg-amber-100 text-amber-600" isEmpty={!profile.hospital_name}>
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">{profile.hospital_name}</p>
          {profile.hospital_location && <p className="text-muted-foreground">{profile.hospital_location}</p>}
        </div>
      </InfoCard>
    </div>
  );
}