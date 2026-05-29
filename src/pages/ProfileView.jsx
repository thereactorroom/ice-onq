import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Phone, MessageSquare, MessageCircle, AlertTriangle, Pill, Activity, Stethoscope, Building2, CreditCard, Pencil, X, Save, User, LayoutDashboard, Users, Heart, CreditCard as WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
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
      <label className="text-xs text-slate-400 uppercase tracking-wider">{label}</label>
      {editing ? (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder || label}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
        />
      ) : (
        <p className="text-sm text-white">{value}</p>
      )}
    </div>
  );
}

function SelectField({ label, name, value, editing, onChange, options }) {
  if (!editing && !value) return null;
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-400 uppercase tracking-wider">{label}</label>
      {editing ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
        >
          <option value="">Select...</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <p className="text-sm text-white">{value}</p>
      )}
    </div>
  );
}

export default function ProfileView() {
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
    // Refetch
    const res = await base44.functions.invoke("getPublicICEProfile", { profileId, userName: urlUserName });
    setData(res.data);
    setForm(res.data?.profile || {});
    setProfileDbId(res.data?.profileDbId || null);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-slate-900 text-lg font-semibold">Profile Not Found</p>
          <p className="text-slate-500 text-sm mt-1">{error || "This ICE profile could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const { profile, contacts, allergies, conditions, medications, user } = data;
  const dob = editing ? form.date_of_birth : profile.date_of_birth;
  const age = dob ? Math.floor((new Date() - new Date(dob)) / 31557600000) : null;
  const sorted = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-8">
      {/* Header */}
      <div className="bg-primary px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm uppercase tracking-wider">ICE onQ — Emergency Medical Profile</span>
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

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-4">

        {/* Identity */}
        <div className="bg-slate-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-400 overflow-hidden flex-shrink-0">
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user?.full_name || urlUserName || "Unknown"}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {dob && <span className="text-sm text-slate-400">DOB: {new Date(dob).toLocaleDateString()}</span>}
                {age !== null && <span className="text-sm text-slate-400">Age: {age}</span>}
                {(editing ? form.blood_group : profile.blood_group) && (editing ? form.blood_group : profile.blood_group) !== "Unknown" && (
                  <span className="px-2 py-0.5 bg-red-600 rounded text-xs font-bold">
                    {editing ? form.blood_group : profile.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} editing={editing} onChange={handleChange} type="date" />
              <SelectField label="Blood Group" name="blood_group" value={form.blood_group} editing={editing} onChange={handleChange} options={bloodGroups} />
            </div>
          )}
        </div>

        {/* Critical Alerts */}
        {profile.critical_alerts?.length > 0 && (
          <div className="bg-red-600 border border-red-700 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              <h2 className="font-bold text-white uppercase text-sm tracking-wider">Critical Medical Alerts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.critical_alerts.map((a, i) => (
                <span key={i} className="px-3 py-1.5 bg-white/20 border border-white/30 rounded-lg text-sm font-bold text-white">{a}</span>
              ))}
            </div>
          </div>
        )}

        {/* Contacts */}
        {sorted.length > 0 && (
          <div className="bg-slate-100 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Emergency Contacts</h2>
            {sorted.map((c) => {
              const phone = cleanPhone(c.mobile);
              const waMsg = encodeURIComponent(`Emergency: I am with ${user?.full_name || "someone"}. Please call back urgently.`);
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-semibold">{c.full_name}</span>
                    {c.is_primary && <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded font-bold ml-1">PRIMARY</span>}
                  </div>
                  <p className="text-slate-500 text-sm mb-2">{c.relationship} · {c.mobile}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-700 hover:bg-green-600 gap-1 text-xs" asChild>
                      <a href={`tel:${phone}`}><Phone className="w-3 h-3" /> Call</a>
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-900 hover:bg-green-800 gap-1 text-xs" asChild>
                      <a href={`https://wa.me/${phone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3 h-3" /> WhatsApp</a>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 gap-1 text-xs" asChild>
                      <a href={`sms:${phone}`}><MessageSquare className="w-3 h-3" /> SMS</a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Medical Info */}
        {(allergies.length > 0 || conditions.length > 0 || medications.length > 0) && (
          <div className="bg-slate-100 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Medical Information</h2>
            {allergies.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Allergies</div>
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((a) => (
                    <span key={a.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${a.is_critical_alert ? "bg-red-100 text-red-700 border border-red-200" : "bg-white border border-slate-200 text-slate-700"}`}>
                      {a.name} <span className="opacity-70">({a.severity})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {conditions.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold mb-1.5"><Activity className="w-3.5 h-3.5" /> Chronic Conditions</div>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <span key={c.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${c.is_critical_alert ? "bg-red-100 text-red-700 border border-red-200" : "bg-white border border-slate-200 text-slate-700"}`}>
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {medications.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold mb-1.5"><Pill className="w-3.5 h-3.5" /> Medications</div>
                <div className="flex flex-wrap gap-1.5">
                  {medications.map((m) => (
                    <span key={m.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${m.is_critical_alert ? "bg-red-100 text-red-700 border border-red-200" : "bg-white border border-slate-200 text-slate-700"}`}>
                      {m.name}{m.dosage && ` ${m.dosage}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Healthcare Details */}
        <div className="bg-slate-100 rounded-2xl p-4 space-y-4">
          <h2 className="font-bold text-slate-500 uppercase text-xs tracking-wider">Healthcare Details</h2>

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-semibold">Medical Aid</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Medical Aid Name" name="medical_aid_name" value={form.medical_aid_name} editing={editing} onChange={handleChange} />
                  <Field label="Membership No." name="medical_aid_number" value={form.medical_aid_number} editing={editing} onChange={handleChange} />
                  <Field label="Plan" name="medical_aid_plan" value={form.medical_aid_plan} editing={editing} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-semibold">Doctor</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Doctor Name" name="doctor_name" value={form.doctor_name} editing={editing} onChange={handleChange} />
                  <Field label="Practice" name="doctor_practice" value={form.doctor_practice} editing={editing} onChange={handleChange} />
                  <Field label="Mobile" name="doctor_mobile" value={form.doctor_mobile} editing={editing} onChange={handleChange} />
                  <Field label="Practice No." name="doctor_practice_number" value={form.doctor_practice_number} editing={editing} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-semibold">Hospital</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preferred Hospital" name="hospital_name" value={form.hospital_name} editing={editing} onChange={handleChange} />
                  <Field label="Location" name="hospital_location" value={form.hospital_location} editing={editing} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase font-semibold">Emergency Notes</p>
                <textarea
                  name="emergency_notes"
                  value={form.emergency_notes || ""}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any additional notes for responders..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          ) : (
            <>
              {profile.medical_aid_name && (
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div><p className="text-sm font-medium text-slate-900">{profile.medical_aid_name}</p><p className="text-xs text-slate-500">Member: {profile.medical_aid_number || "—"}</p></div>
                </div>
              )}
              {profile.doctor_name && (
                <div className="flex items-start gap-2">
                  <Stethoscope className="w-4 h-4 text-sky-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{profile.doctor_name}</p>
                    {profile.doctor_practice && <p className="text-xs text-slate-500">{profile.doctor_practice}</p>}
                    {profile.doctor_mobile && <a href={`tel:${cleanPhone(profile.doctor_mobile)}`} className="text-xs text-green-400 underline">{profile.doctor_mobile}</a>}
                  </div>
                </div>
              )}
              {profile.hospital_name && (
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div><p className="text-sm font-medium text-slate-900">{profile.hospital_name}</p>{profile.hospital_location && <p className="text-xs text-slate-500">{profile.hospital_location}</p>}</div>
                </div>
              )}
              {!profile.medical_aid_name && !profile.doctor_name && !profile.hospital_name && (
                <p className="text-sm text-slate-400 italic">No healthcare details added yet.</p>
              )}
            </>
          )}
        </div>

        {/* Emergency Notes (view only) */}
        {!editing && profile.emergency_notes && (
          <div className="bg-amber-900/40 border border-amber-700 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase mb-1">Emergency Notes</p>
            <p className="text-sm text-amber-100 whitespace-pre-wrap">{profile.emergency_notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pt-2">ICE onQ · Emergency Medical Profile</p>
      </div>

      {isOwner && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
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