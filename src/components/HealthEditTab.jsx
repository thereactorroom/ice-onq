import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, X, Save, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ── small inline form dialog ──────────────────────────────────────────────────
function ItemDialog({ title, fields, initial, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isEditing = !!initial?.id;

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
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-24" onClick={onClose}>
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
          {isEditing && (
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete this entry
              </button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => { setShowDeleteConfirm(false); onDelete(initial.id); onClose(); }}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── generic section ───────────────────────────────────────────────────────────
function Section({ title, icon, items, fields, entityName, profileId, profileDbId, reviewedField, reviewedDate, onReviewed, renderTag }) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const [stamping, setStamping] = useState(false);

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

  async function stampReviewed(isoDate) {
    if (!profileDbId || !reviewedField) return;
    await base44.functions.invoke("updatePublicICEProfile", {
      profileId: profileDbId,
      updates: { [reviewedField]: isoDate },
    });
    if (onReviewed) onReviewed(reviewedField, isoDate);
  }

  async function handleSave(form) {
    if (dialog.item?.id) {
      await update.mutateAsync({ id: dialog.item.id, data: form });
    } else {
      await create.mutateAsync(form);
    }
    await stampReviewed(new Date().toISOString());
  }

  async function handleMarkReviewed() {
    setStamping(true);
    await stampReviewed(new Date().toISOString());
    setStamping(false);
  }

  const formatted = formatDate(reviewedDate);

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
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium ${formatted ? "text-muted-foreground" : "text-warning"}`}>
          {formatted ? `Last reviewed: ${formatted}` : "Not yet reviewed"}
        </span>
        <button
          onClick={handleMarkReviewed}
          disabled={stamping}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 text-[10px] font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${stamping ? "animate-spin" : ""}`} />
          {stamping ? "Saving..." : "Mark as Reviewed"}
        </button>
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
          </div>
        ))}
      </div>

      {dialog && (
        <ItemDialog
          title={dialog.item?.id ? `Edit ${title.slice(0, -1)}` : `Add ${title.slice(0, -1)}`}
          fields={fields}
          initial={dialog.item || {}}
          onSave={handleSave}
          onDelete={(id) => remove.mutate(id)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function HealthEditTab({ profileId, profileDbId, reviewedDates = {}, onReviewed }) {
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
    <div className="space-y-4 pb-36">
      <Section
        title="Allergies"
        icon="⚠️"
        items={allergies}
        entityName="Allergy"
        profileId={profileId}
        profileDbId={profileDbId}
        reviewedField="allergies_reviewed_date"
        reviewedDate={reviewedDates.allergies_reviewed_date}
        onReviewed={onReviewed}
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
        profileDbId={profileDbId}
        reviewedField="conditions_reviewed_date"
        reviewedDate={reviewedDates.conditions_reviewed_date}
        onReviewed={onReviewed}
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
        profileDbId={profileDbId}
        reviewedField="medications_reviewed_date"
        reviewedDate={reviewedDates.medications_reviewed_date}
        onReviewed={onReviewed}
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