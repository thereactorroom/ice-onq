import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Phone, MessageSquare, MessageCircle, AlertTriangle, Pill, Activity, Stethoscope, Building2, CreditCard, Pencil, X, Save, LayoutDashboard, Users, Heart, CreditCard as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQueryString } from "@/hooks/useQueryString";
import ProfileHeader from "../components/ProfileHeader";
import CriticalAlertsBanner from "../components/CriticalAlertsBanner";
import ContactCard from "../components/ContactCard";
import MedicalInfoDisplay from "../components/MedicalInfoDisplay";
import DoctorHospitalInfo from "../components/DoctorHospitalInfo";

const navItems = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/contacts", label: "Contacts", icon: Users },
  { path: "/medical", label: "Medical", icon: Heart },
  { path: "/wallet-card", label: "Wallet Card", icon: WalletIcon },
];

function cleanPhone(num) {
  return (num || "").replace(/[^+\d]/g, "");
}

function Field({ label, value, editing, name, onChange, type = "text", placeholder }) {
  if (!editing && !value) return null;
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</label>
      {editing ? (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder || label}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        />
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

function SelectField({ label, name, value, editing, onChange, options }) {
  if (!editing && !value) return null;
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground uppercase tracking-wider">{label}</label>
      {editing ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">Select...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}

export default function ProfileView() {
  const queryString = useQueryString();
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id") || params.get("fID");
  const viewerEmail = params.get("userEmail");
  const urlUserName = params.get("UserName");
  const isOwner = params.get("Owner")?.toLowerCase() === "true";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [profileDbId, setProfileDbId] = useState(null);

  useEffect(() => {
    if (!profileId) { setError("User not found."); setLoading(false); return; }
    base44.functions.invoke("getPublicICEProfile", { profileId, userName: urlUserName })
      .then((res) => { setData(res.data); setForm(res.data?.profile || {}); setProfileDbId(res.data?.profileDbId || null); setLoading(false); })
      .catch(() => { setError("Could not load profile."); setLoading(false); });
  }, [profileId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await base44.functions.invoke("updatePublicICEProfile", {
      profileId: profileDbId,
      userEmail: viewerEmail,
      updates: form
    });
    const res = await base44.functions.invoke("getPublicICEProfile", { profileId, userName: urlUserName });
    setData(res.data);
    setForm(res.data?.profile || {});
    setProfileDbId(res.data?.profileDbId || null);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !profileId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-emergency mx-auto mb-3" />
          <p className="text-foreground text-lg font-semibold">User Not Found</p>
          <p className="text-muted-foreground text-sm mt-1">No profile ID was provided.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-emergency mx-auto mb-3" />
          <p className="text-foreground text-lg font-semibold">Could Not Load Profile</p>
          <p className="text-muted-foreground text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { profile, contacts, allergies, conditions, medications, user } = data;
  const dob = editing ? form.date_of_birth : profile.date_of_birth;
  const age = dob ? Math.floor((new Date() - new Date(dob)) / 31557600000) : null;
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      {/* Header */}
      <div className="bg-primary sticky top-0 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 animate-pulse text-white" />
            <span className="font-bold text-sm uppercase tracking-wider text-white">ICE onQ</span>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={saving}
                    className="bg-green-600 hover:bg-green-500 gap-1 text-xs">
                    <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm(profile); }}
                    className="text-white hover:bg-red-700 gap-1 text-xs">
                    <X className="w-3 h-3" /> Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)}
                  className="bg-white text-red-600 hover:bg-red-50 gap-1 text-xs font-semibold">
                  <Pencil className="w-3 h-3" /> Edit Profile
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-4">

        {/* Profile Header */}
        {!editing && <ProfileHeader user={user} profile={profile} contacts={sortedContacts} allergies={allergies} conditions={conditions} medications={medications} />}

        {/* Identity (Editing Mode) */}
        {editing && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile.profile_photo ? (
                  <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-2xl">👤</div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{user?.full_name || urlUserName || "Unknown"}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dob && <span className="text-sm text-muted-foreground">DOB: {new Date(dob).toLocaleDateString()}</span>}
                  {age !== null && <span className="text-sm text-muted-foreground">Age: {age}</span>}
                  {(editing ? form.blood_group : profile.blood_group) && (editing ? form.blood_group : profile.blood_group) !== "Unknown" && (
                    <span className="px-2 py-0.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold">
                      {editing ? form.blood_group : profile.blood_group}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} editing={editing} onChange={handleChange} type="date" />
              <SelectField label="Blood Group" name="blood_group" value={form.blood_group} editing={editing} onChange={handleChange} options={bloodGroups} />
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        <CriticalAlertsBanner alerts={profile.critical_alerts} />

        {/* Contacts */}
        {sortedContacts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground">Emergency Contacts</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sortedContacts.map((c) => (
                <ContactCard key={c.id} contact={c} userName={user?.full_name} />
              ))}
            </div>
          </div>
        )}

        {/* Medical Info */}
        <MedicalInfoDisplay allergies={allergies} conditions={conditions} medications={medications} />

        {/* Healthcare Details */}
        {editing ? (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <h2 className="font-bold text-foreground uppercase text-xs tracking-wider">Healthcare Details</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Medical Aid</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Medical Aid Name" name="medical_aid_name" value={form.medical_aid_name} editing={editing} onChange={handleChange} />
                  <Field label="Membership No." name="medical_aid_number" value={form.medical_aid_number} editing={editing} onChange={handleChange} />
                  <Field label="Plan" name="medical_aid_plan" value={form.medical_aid_plan} editing={editing} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Doctor</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Doctor Name" name="doctor_name" value={form.doctor_name} editing={editing} onChange={handleChange} />
                  <Field label="Practice" name="doctor_practice" value={form.doctor_practice} editing={editing} onChange={handleChange} />
                  <Field label="Mobile" name="doctor_mobile" value={form.doctor_mobile} editing={editing} onChange={handleChange} />
                  <Field label="Practice No." name="doctor_practice_number" value={form.doctor_practice_number} editing={editing} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Hospital</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preferred Hospital" name="hospital_name" value={form.hospital_name} editing={editing} onChange={handleChange} />
                  <Field label="Location" name="hospital_location" value={form.hospital_location} editing={editing} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Emergency Notes</p>
                <textarea
                  name="emergency_notes"
                  value={form.emergency_notes || ""}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any additional notes for responders..."
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <DoctorHospitalInfo profile={profile} />
        )}

        {!editing && profile.emergency_notes && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-foreground text-sm mb-2">Emergency Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.emergency_notes}</p>
          </div>
        )}
      </div>

      {isOwner && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={`${item.path}${queryString}`}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}