import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function EditContactDialog({ open, onOpenChange, contact, onSave }) {
  const [form, setForm] = useState({
    full_name: "", relationship: "", mobile: "", alternative_number: "",
    email: "", notes: "", is_primary: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setForm({
        full_name: contact.full_name || "",
        relationship: contact.relationship || "",
        mobile: contact.mobile || "",
        alternative_number: contact.alternative_number || "",
        email: contact.email || "",
        notes: contact.notes || "",
        is_primary: contact.is_primary || false,
      });
    } else {
      setForm({ full_name: "", relationship: "", mobile: "", alternative_number: "", email: "", notes: "", is_primary: false });
    }
  }, [contact, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Emergency Contact"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Relationship *</Label>
            <Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} required placeholder="e.g. Spouse, Parent, Sibling" />
          </div>
          <div className="space-y-2">
            <Label>Mobile Number *</Label>
            <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required placeholder="+27 82 123 4567" />
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
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving..." : "Save Contact"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}