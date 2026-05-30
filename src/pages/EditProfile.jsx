import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Save, AlertTriangle, X, Check } from "lucide-react";
import { toast } from "sonner";
import { base44 as b44 } from "@/api/base44Client";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

function ItemList({ items, onEdit, onDelete, renderItem }) {
  const [deleteId, setDeleteId] = useState(null);
  return (
    <>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">{renderItem(item)}</div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="w-3 h-3" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
      </div>
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>This will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { onDelete(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SimpleItemDialog({ open, onOpenChange, title, fields, item, onSave }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const init = {};
    fields.forEach((f) => { init[f.key] = item?.[f.key] || (f.type === "boolean" ? false : ""); });
    setForm(init);
  }, [item, open]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{item ? `Edit ${title}` : `Add ${title}`}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{f.required && " *"}</Label>
              {f.type === "select" ? (
                <Select value={form[f.key] || ""} onValueChange={(v) => setForm({ ...form, [f.key]: v })}>
                  <SelectTrigger><SelectValue placeholder={`Select ${f.label}`} /></SelectTrigger>
                  <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              ) : f.type === "boolean" ? (
                <div className="flex items-center gap-2"><Switch checked={!!form[f.key]} onCheckedChange={(v) => setForm({ ...form, [f.key]: v })} /><span className="text-sm text-muted-foreground">Promote to Critical Alert</span></div>
              ) : (
                <Input value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} placeholder={f.placeholder} />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EditProfile() {
  const qc = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["iceProfile", user?.email],
    queryFn: () => base44.entities.ICEProfile.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });
  const profile = profiles[0];
  const { data: allergies = [] } = useQuery({ queryKey: ["allergies", user?.email], queryFn: () => base44.entities.Allergy.filter({ created_by: user.email }), enabled: !!user?.email });
  const { data: conditions = [] } = useQuery({ queryKey: ["conditions", user?.email], queryFn: () => base44.entities.ChronicCondition.filter({ created_by: user.email }), enabled: !!user?.email });
  const { data: medications = [] } = useQuery({ queryKey: ["medications", user?.email], queryFn: () => base44.entities.Medication.filter({ created_by: user.email }), enabled: !!user?.email });

  const [form, setForm] = useState({});
  const [alertInput, setAlertInput] = useState("");
  const [itemDialog, setItemDialog] = useState({ open: false, type: null, item: null });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || "",
        date_of_birth: profile.date_of_birth || "",
        blood_group: profile.blood_group || "",
        medical_aid_name: profile.medical_aid_name || "",
        medical_aid_number: profile.medical_aid_number || "",
        medical_aid_plan: profile.medical_aid_plan || "",
        doctor_name: profile.doctor_name || "",
        doctor_practice: profile.doctor_practice || "",
        doctor_mobile: profile.doctor_mobile || "",
        doctor_practice_number: profile.doctor_practice_number || "",
        hospital_name: profile.hospital_name || "",
        hospital_location: profile.hospital_location || "",
        emergency_notes: profile.emergency_notes || "",
        critical_alerts: profile.critical_alerts || [],
        pre_login_enabled: profile.pre_login_enabled || false,
      });
    }
  }, [profile]);

  const saveMut = useMutation({
    mutationFn: (data) => profile ? base44.entities.ICEProfile.update(profile.id, { ...data, last_reviewed_date: new Date().toISOString() }) : base44.entities.ICEProfile.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["iceProfile"] }); toast.success("Profile saved"); },
  });

  const allergyCreate = useMutation({ mutationFn: (d) => base44.entities.Allergy.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["allergies"] }) });
  const allergyUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.Allergy.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["allergies"] }) });
  const allergyDelete = useMutation({ mutationFn: (id) => base44.entities.Allergy.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["allergies"] }) });

  const condCreate = useMutation({ mutationFn: (d) => base44.entities.ChronicCondition.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["conditions"] }) });
  const condUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.ChronicCondition.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["conditions"] }) });
  const condDelete = useMutation({ mutationFn: (id) => base44.entities.ChronicCondition.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["conditions"] }) });

  const medCreate = useMutation({ mutationFn: (d) => base44.entities.Medication.create(d), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });
  const medUpdate = useMutation({ mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });
  const medDelete = useMutation({ mutationFn: (id) => base44.entities.Medication.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["medications"] }) });

  const handleItemSave = async (formData) => {
    const { type, item } = itemDialog;
    if (type === "allergy") { item ? await allergyUpdate.mutateAsync({ id: item.id, data: formData }) : await allergyCreate.mutateAsync(formData); }
    if (type === "condition") { item ? await condUpdate.mutateAsync({ id: item.id, data: formData }) : await condCreate.mutateAsync(formData); }
    if (type === "medication") { item ? await medUpdate.mutateAsync({ id: item.id, data: formData }) : await medCreate.mutateAsync(formData); }
  };

  const addAlert = () => {
    if (alertInput.trim() && !form.critical_alerts?.includes(alertInput.trim())) {
      setForm({ ...form, critical_alerts: [...(form.critical_alerts || []), alertInput.trim()] });
      setAlertInput("");
    }
  };
  const removeAlert = (a) => setForm({ ...form, critical_alerts: (form.critical_alerts || []).filter((x) => x !== a) });

  const itemFields = {
    allergy: [
      { key: "name", label: "Allergy Name", required: true, placeholder: "e.g. Penicillin" },
      { key: "severity", label: "Severity", type: "select", options: ["Mild", "Moderate", "Severe", "Life-Threatening"], required: true },
      { key: "is_critical_alert", label: "Critical Alert", type: "boolean" },
    ],
    condition: [
      { key: "name", label: "Condition Name", required: true, placeholder: "e.g. Diabetes" },
      { key: "notes", label: "Notes", placeholder: "Additional details" },
      { key: "is_critical_alert", label: "Critical Alert", type: "boolean" },
    ],
    medication: [
      { key: "name", label: "Medication Name", required: true, placeholder: "e.g. Metformin" },
      { key: "dosage", label: "Dosage", placeholder: "e.g. 500mg" },
      { key: "frequency", label: "Frequency", placeholder: "e.g. Twice daily" },
      { key: "is_critical_alert", label: "Critical Alert", type: "boolean" },
    ],
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{profile ? "Edit" : "Create"} ICE Profile</h2>
          <p className="text-sm text-muted-foreground">Manage your emergency medical information</p>
        </div>
        <Button className="gap-1.5" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          <Save className="w-4 h-4" /> {saveMut.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold">Personal Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5 col-span-2">
                <Label>Full Name (Medical / Legal)</Label>
                <Input value={form.display_name || ""} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Name used on all medical records" />
                <p className="text-xs text-muted-foreground">This name appears on your emergency profile and wallet card.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth || ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <Select value={form.blood_group || ""} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                  <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emergency" />
              <h3 className="font-semibold">Critical Medical Alerts</h3>
            </div>
            <p className="text-sm text-muted-foreground">These appear prominently on your emergency profile. Add conditions that responders need to know immediately.</p>
            <div className="flex gap-2">
              <Input value={alertInput} onChange={(e) => setAlertInput(e.target.value)} placeholder="e.g. Severe Penicillin Allergy" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAlert())} />
              <Button type="button" onClick={addAlert} variant="outline"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(form.critical_alerts || []).map((a, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emergency/10 text-emergency text-sm font-medium">
                  {a}
                  <button onClick={() => removeAlert(a)} className="hover:bg-emergency/20 rounded p-0.5"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h3 className="font-semibold">Emergency Notes</h3>
            <Textarea value={form.emergency_notes || ""} onChange={(e) => setForm({ ...form, emergency_notes: e.target.value })} maxLength={500} rows={3} placeholder="e.g. Insulin dependent, Carries EpiPen, Hearing impaired" />
            <p className="text-xs text-muted-foreground text-right">{(form.emergency_notes || "").length}/500</p>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4 mt-4">
          {[
            { key: "allergy", title: "Allergies", items: allergies, render: (a) => <div><span className="font-medium text-sm">{a.name}</span><span className="text-xs text-muted-foreground ml-2">{a.severity}</span>{a.is_critical_alert && <span className="ml-2 text-[10px] bg-emergency/10 text-emergency px-1.5 py-0.5 rounded font-bold">ALERT</span>}</div> },
            { key: "condition", title: "Chronic Conditions", items: conditions, render: (c) => <div><span className="font-medium text-sm">{c.name}</span>{c.notes && <span className="text-xs text-muted-foreground ml-2">{c.notes}</span>}{c.is_critical_alert && <span className="ml-2 text-[10px] bg-emergency/10 text-emergency px-1.5 py-0.5 rounded font-bold">ALERT</span>}</div> },
            { key: "medication", title: "Medications", items: medications, render: (m) => <div><span className="font-medium text-sm">{m.name}</span>{m.dosage && <span className="text-xs text-muted-foreground ml-2">{m.dosage}</span>}{m.frequency && <span className="text-xs text-muted-foreground ml-1">· {m.frequency}</span>}{m.is_critical_alert && <span className="ml-2 text-[10px] bg-emergency/10 text-emergency px-1.5 py-0.5 rounded font-bold">ALERT</span>}</div> },
          ].map(({ key, title, items, render }) => (
            <div key={key} className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{title}</h3>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setItemDialog({ open: true, type: key, item: null })}>
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No {title.toLowerCase()} recorded yet</p>
              ) : (
                <ItemList
                  items={items}
                  onEdit={(item) => setItemDialog({ open: true, type: key, item })}
                  onDelete={(id) => key === "allergy" ? allergyDelete.mutate(id) : key === "condition" ? condDelete.mutate(id) : medDelete.mutate(id)}
                  renderItem={render}
                />
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="healthcare" className="space-y-4 mt-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold">Medical Aid</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5"><Label>Medical Aid Name</Label><Input value={form.medical_aid_name || ""} onChange={(e) => setForm({ ...form, medical_aid_name: e.target.value })} placeholder="e.g. Discovery Health" /></div>
              <div className="space-y-1.5"><Label>Membership Number</Label><Input value={form.medical_aid_number || ""} onChange={(e) => setForm({ ...form, medical_aid_number: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Plan</Label><Input value={form.medical_aid_plan || ""} onChange={(e) => setForm({ ...form, medical_aid_plan: e.target.value })} /></div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold">Treating Doctor</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Doctor Name</Label><Input value={form.doctor_name || ""} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Practice Name</Label><Input value={form.doctor_practice || ""} onChange={(e) => setForm({ ...form, doctor_practice: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Mobile Number</Label><Input value={form.doctor_mobile || ""} onChange={(e) => setForm({ ...form, doctor_mobile: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Practice Number</Label><Input value={form.doctor_practice_number || ""} onChange={(e) => setForm({ ...form, doctor_practice_number: e.target.value })} /></div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold">Preferred Hospital</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Hospital Name</Label><Input value={form.hospital_name || ""} onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Location</Label><Input value={form.hospital_location || ""} onChange={(e) => setForm({ ...form, hospital_location: e.target.value })} /></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold">Emergency Access</h3>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
              <Switch checked={!!form.pre_login_enabled} onCheckedChange={(v) => setForm({ ...form, pre_login_enabled: v })} />
              <div>
                <p className="font-medium text-sm">Allow ICE Access Before Login</p>
                <p className="text-xs text-muted-foreground mt-0.5">When enabled, selected emergency information can be viewed from this device without requiring login.</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-3">Review Status</h3>
            <Button variant="outline" className="gap-1.5" onClick={() => { setForm({ ...form }); saveMut.mutate({ ...form, last_reviewed_date: new Date().toISOString() }); }}>
              <Check className="w-4 h-4" /> Mark as Reviewed
            </Button>
            {profile?.last_reviewed_date && (
              <p className="text-xs text-muted-foreground mt-2">Last reviewed: {new Date(profile.last_reviewed_date).toLocaleDateString()}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {itemDialog.type && (
        <SimpleItemDialog
          open={itemDialog.open}
          onOpenChange={(open) => setItemDialog({ ...itemDialog, open })}
          title={itemDialog.type === "allergy" ? "Allergy" : itemDialog.type === "condition" ? "Condition" : "Medication"}
          fields={itemFields[itemDialog.type]}
          item={itemDialog.item}
          onSave={handleItemSave}
        />
      )}
    </div>
  );
}