import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BookUser, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const RELATIONSHIPS = [
  "Spouse / Partner", "Parent", "Child", "Sibling",
  "Other Family Member", "Friend", "Colleague", "Neighbour", "Caregiver", "Other"
];

export default function EditContactDialog({ open, onOpenChange, contact, onSave, onDelete }) {
  const [form, setForm] = useState({
    full_name: "", relationship: "", mobile: "", alternative_number: "",
    email: "", notes: "", is_primary: false,
  });
  const [customRelationship, setCustomRelationship] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const hasContactPicker = typeof navigator !== "undefined" && "contacts" in navigator;

  const pickFromPhonebook = async () => {
    try {
      const results = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (!results || results.length === 0) return;
      const picked = results[0];
      // Get phone
      const phone = picked.tel?.[0] || "";
      // Build truncated name: first word + last word of first name entry
      let name = "";
      const rawName = picked.name?.[0] || "";
      if (rawName) {
        const parts = rawName.trim().split(/\s+/);
        name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
      }
      setForm((prev) => ({
        ...prev,
        mobile: phone || prev.mobile,
        full_name: name || prev.full_name,
      }));
    } catch (err) {
      // User cancelled or permission denied — silently ignore
    }
  };

  useEffect(() => {
    if (contact) {
      const rel = contact.relationship || "";
      const isKnown = RELATIONSHIPS.includes(rel);
      setForm({
        full_name: contact.full_name || "",
        relationship: isKnown ? rel : (rel ? "Other" : ""),
        mobile: contact.mobile || "",
        alternative_number: contact.alternative_number || "",
        email: contact.email || "",
        notes: contact.notes || "",
        is_primary: contact.is_primary || false,
      });
      setCustomRelationship(isKnown ? "" : rel);
    } else {
      setForm({ full_name: "", relationship: "", mobile: "", alternative_number: "", email: "", notes: "", is_primary: false });
      setCustomRelationship("");
    }
  }, [contact, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const finalForm = {
      ...form,
      relationship: form.relationship === "Other" ? customRelationship : form.relationship,
    };
    await onSave(finalForm);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{contact ? "Edit Contact" : "Add Emergency Contact"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Mobile Number *</Label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  required
                  placeholder="+27 82 123 4567"
                />
                {hasContactPicker && (
                  <Button type="button" variant="outline" size="icon" onClick={pickFromPhonebook} title="Pick from contacts">
                    <BookUser className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="First Last" />
            </div>
            <div className="space-y-2">
              <Label>Relationship *</Label>
              <select
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                required
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select relationship...</option>
                {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {form.relationship === "Other" && (
                <Input
                  value={customRelationship}
                  onChange={(e) => setCustomRelationship(e.target.value)}
                  required
                  placeholder="Please specify..."
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Alternative Number</Label>
              <Input value={form.alternative_number} onChange={(e) => setForm({ ...form, alternative_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any additional notes..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Primary Contact</Label>
              <Switch checked={form.is_primary} onCheckedChange={(v) => setForm({ ...form, is_primary: v })} />
            </div>
            {contact && onDelete && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete this contact
                </button>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Contact"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{contact?.full_name}</strong> from your emergency contacts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => { setShowDeleteConfirm(false); onOpenChange(false); onDelete(contact.id); }}>
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}