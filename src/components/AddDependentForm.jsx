import { useState } from "react";
import { Shield, ArrowLeft, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const RELATIONSHIPS = ["Child", "Spouse / Partner", "Parent", "Sibling", "Other"];

export default function AddDependentForm({ guardianFid, onBack, onCreated }) {
  const [form, setForm] = useState({
    display_name: "",
    date_of_birth: "",
    blood_group: "",
    dependent_relationship: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    if (!form.display_name.trim()) {
      setError("Please enter the dependent's name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Create the ICEProfile record immediately, linked to the guardian
      const profile = await base44.entities.ICEProfile.create({
        display_name: form.display_name,
        date_of_birth: form.date_of_birth || undefined,
        blood_group: form.blood_group || undefined,
        dependent_relationship: form.dependent_relationship || undefined,
        guardian_fid: String(guardianFid),
        fusion_link_pending: true,
        pre_login_enabled: true,
      });
      onCreated(profile);
    } catch (e) {
      setError(e?.message || "Could not create profile. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary shadow-lg sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={onBack} className="text-white/80 hover:text-white transition-colors mr-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-6 h-6 text-white" />
          <div>
            <div className="font-bold text-white tracking-wider leading-none">ICE onQ</div>
            <div className="text-white/70 text-xs mt-0.5">Add a Dependent</div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Dependent Profile</h2>
          <p className="text-sm text-muted-foreground">
            Enter the basic details below. Their ICE record will be created immediately and linked to your account.
          </p>
        </div>

        {/* Identity card */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Full Name *</label>
              <input
                name="display_name"
                value={form.display_name}
                onChange={handleChange}
                placeholder="Legal / medical name"
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Relationship</label>
              <select
                name="dependent_relationship"
                value={form.dependent_relationship}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                <option value="">Select relationship...</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Date of Birth</label>
                <input
                  name="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Blood Group</label>
                <select
                  name="blood_group"
                  value={form.blood_group}
                  onChange={handleChange}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Select...</option>
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Note:</strong> Their ICE profile is saved immediately to your account. 
          You can fill in full medical details (contacts, allergies, medications) after saving.
          A fusion onQ identity link can be added later if needed.
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 h-11">
          <Save className="w-4 h-4" />
          {saving ? "Creating Profile..." : "Create & Continue to Medical Info"}
        </Button>
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