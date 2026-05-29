import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export default function ICEStatusBadge({ profile, contacts = [], allergies = [], conditions = [], medications = [] }) {
  const hasContacts = contacts.length > 0;
  const hasMedicalInfo = allergies.length > 0 || conditions.length > 0 || medications.length > 0;
  const hasAlerts = profile?.critical_alerts?.length > 0;
  const hasDoctor = !!profile?.doctor_name;
  const hasMedicalAid = !!profile?.medical_aid_name;

  const sections = [hasContacts, hasMedicalInfo, hasAlerts, hasDoctor, hasMedicalAid];
  const completed = sections.filter(Boolean).length;

  if (completed === sections.length) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold whitespace-nowrap">
        <CheckCircle className="w-3.5 h-3.5" />
        Complete
      </div>
    );
  }
  if (completed >= 2) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5" />
        Partial
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5" />
      Incomplete
    </div>
  );
}