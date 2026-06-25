import { Pill, AlertTriangle, Activity } from "lucide-react";

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function Section({ icon: Icon, color, title, reviewedDate, children }) {
  const formatted = formatDate(reviewedDate);
  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <span className={`text-[10px] font-medium ${formatted ? "text-muted-foreground" : "text-warning"}`}>
          {formatted ? `Updated ${formatted}` : "Not reviewed"}
        </span>
      </div>
      {children}
    </div>
  );
}

function Tag({ label, sub, critical }) {
  return (
    <div className={`px-3 py-2 rounded-xl text-sm ${critical ? "bg-emergency/10 text-emergency border border-emergency/20" : "bg-muted text-foreground"}`}>
      <span className="font-medium">{label}</span>
      {sub && <span className="text-muted-foreground ml-1 text-xs">— {sub}</span>}
    </div>
  );
}

export default function MedicalInfoDisplay({ allergies = [], conditions = [], medications = [], profile = {} }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section icon={AlertTriangle} title="Allergies" color="bg-red-100 text-red-600" reviewedDate={profile.allergies_reviewed_date}>
        {allergies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allergies recorded</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allergies.map((a) => <Tag key={a.id} label={a.name} sub={a.severity} critical={a.is_critical_alert} />)}
          </div>
        )}
      </Section>

      <Section icon={Activity} title="Chronic Conditions" color="bg-blue-100 text-blue-600" reviewedDate={profile.conditions_reviewed_date}>
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conditions recorded</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => <Tag key={c.id} label={c.name} sub={c.notes} critical={c.is_critical_alert} />)}
          </div>
        )}
      </Section>

      <Section icon={Pill} title="Medications" color="bg-purple-100 text-purple-600" reviewedDate={profile.medications_reviewed_date}>
        {medications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medications recorded</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {medications.map((m) => <Tag key={m.id} label={m.name} sub={m.dosage ? `${m.dosage} · ${m.frequency || ""}` : m.frequency} critical={m.is_critical_alert} />)}
          </div>
        )}
      </Section>
    </div>
  );
}