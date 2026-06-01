import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── small inline form dialog ──────────────────────────────────────────────────
function ItemDialog({ title, fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(({ name, label, type = "text", options }) => (
            <div key={name}>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
              {options ? (
                <select name={name} value={form[name] || ""} onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary">
                  <option value="">Select...</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name={name} checked={!!form[name]} onChange={handleChange} className="rounded" />
                  <span>Mark as critical alert</span>
                </label>
              ) : (
                <input type={type} name={name} value={form[name] || ""} onChange={handleChange}
                  placeholder={label}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              )}
            </div>
          ))}
          <Button type="submit" disabled={saving} className="w-full gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── generic section ───────────────────────────────────────────────────────────
function Section({ title, icon, items, fields, entityName, profileId, renderTag }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null); // null | { mode: 'add'|'edit', item?: {} }

  const create = useMutation({
    mutationFn: (data) => base44.entities[entityName].create({ ...data, profile_id: profileId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entityName, profileId] }),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entityName, profileId] }),
  });
  const remove = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entityName, profileId] }),
  });

  async function handleSave(form) {
    if (dialog.item?.id) {
      await update.mutateAsync({ id: dialog.item.id, data: form });
    } else {
      await create.mutateAsync(form);
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        </div>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
          onClick={() => setDialog({ mode: "add" })}>
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">None added yet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            item.is_critical_alert ? "bg-emergency/10 border-emergency/30 text-emergency" : "bg-muted border-border text-foreground"
          }`}>
            <span>{renderTag(item)}</span>
            <button onClick={() => setDialog({ mode: "edit", item })} className="opacity-60 hover:opacity-100">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => remove.mutate(item.id)} className="opacity-60 hover:opacity-100">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <ItemDialog
          title={dialog.item?.id ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}
          fields={fields}
          initial={dialog.item || {}}
          onSave={handleSave}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function HealthEditTab({ profileId }) {
  const { data: allergies = [] } = useQuery({
    queryKey: ["Allergy", profileId],
    queryFn: () => base44.entities.Allergy.filter({ profile_id: profileId }),
    enabled: !!profileId,
  });
  const { data: conditions = [] } = useQuery({
    queryKey: ["ChronicCondition", profileId],
    queryFn: () => base44.entities.ChronicCondition.filter({ profile_id: profileId }),
    enabled: !!profileId,
  });
  const { data: medications = [] } = useQuery({
    queryKey: ["Medication", profileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: profileId }),
    enabled: !!profileId,
  });

  return (
    <div className="space-y-4 pb-24">
      <Section
        title="Allergies"
        icon="⚠️"
        items={allergies}
        entityName="Allergy"
        profileId={profileId}
        fields={[
          { name: "name", label: "Allergy Name" },
          { name: "severity", label: "Severity", options: ["Mild", "Moderate", "Severe", "Life-Threatening"] },
          { name: "is_critical_alert", label: "Critical Alert", type: "checkbox" },
        ]}
        renderTag={(a) => `${a.name}${a.severity ? ` · ${a.severity}` : ""}`}
      />

      <Section
        title="Chronic Conditions"
        icon="🫀"
        items={conditions}
        entityName="ChronicCondition"
        profileId={profileId}
        fields={[
          { name: "name", label: "Condition Name" },
          { name: "notes", label: "Notes" },
          { name: "is_critical_alert", label: "Critical Alert", type: "checkbox" },
        ]}
        renderTag={(c) => c.name}
      />

      <Section
        title="Medications"
        icon="💊"
        items={medications}
        entityName="Medication"
        profileId={profileId}
        fields={[
          { name: "name", label: "Medication Name" },
          { name: "dosage", label: "Dosage" },
          { name: "frequency", label: "Frequency" },
          { name: "is_critical_alert", label: "Critical Alert", type: "checkbox" },
        ]}
        renderTag={(m) => `${m.name}${m.dosage ? ` ${m.dosage}` : ""}`}
      />
    </div>
  );
}