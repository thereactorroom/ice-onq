import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Shield, Pencil, ArrowLeft, Users, Info, LayoutDashboard, CreditCard as WalletIcon, Save, X, QrCode, Smartphone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileHeader from "../components/ProfileHeader";
import CriticalAlertsBanner from "../components/CriticalAlertsBanner";
import ContactCard from "../components/ContactCard";
import MedicalInfoDisplay from "../components/MedicalInfoDisplay";
import DoctorHospitalInfo from "../components/DoctorHospitalInfo";
import WalletCardPreview from "../components/WalletCardPreview";
import ManageContacts from "./ManageContacts";
import HealthEditTab from "../components/HealthEditTab";
import FusionUserDialog from "../components/FusionUserDialog";

// ── helpers ──────────────────────────────────────────────────────────────────
function Field({ label, name, value, onChange, type = "text", placeholder, span2 }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder || label}
        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

// ── MedicalEditTab ────────────────────────────────────────────────────────────
function MedicalEditTab({ profile, profileDbId, viewerEmail, onSaved }) {
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await base44.functions.invoke("updatePublicICEProfile", {
      profileId: profile.id,
      updates: form,
    });
    setSaving(false);
    onSaved(form);
  }

  return (
    <div className="space-y-4 pb-36">
      {/* Name */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity</h3>
        <p className="text-xs text-muted-foreground -mt-2">This name is used on all medical and emergency records.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name (Medical)" name="display_name" value={form.display_name} onChange={handleChange} span2 placeholder="Legal / medical name" />
          <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} type="date" />
          <SelectField label="Blood Group" name="blood_group" value={form.blood_group} onChange={handleChange} options={BLOOD_GROUPS} />
        </div>
      </div>

      {/* Medical Aid */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Medical Aid</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Medical Aid Name" name="medical_aid_name" value={form.medical_aid_name} onChange={handleChange} />
          <Field label="Membership No." name="medical_aid_number" value={form.medical_aid_number} onChange={handleChange} />
          <Field label="Plan" name="medical_aid_plan" value={form.medical_aid_plan} onChange={handleChange} />
        </div>
      </div>

      {/* Doctor */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Doctor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Doctor Name" name="doctor_name" value={form.doctor_name} onChange={handleChange} />
          <Field label="Practice" name="doctor_practice" value={form.doctor_practice} onChange={handleChange} />
          <Field label="Mobile" name="doctor_mobile" value={form.doctor_mobile} onChange={handleChange} />
          <Field label="Practice No." name="doctor_practice_number" value={form.doctor_practice_number} onChange={handleChange} />
        </div>
      </div>

      {/* Hospital */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hospital</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Preferred Hospital" name="hospital_name" value={form.hospital_name} onChange={handleChange} />
          <Field label="Location" name="hospital_location" value={form.hospital_location} onChange={handleChange} />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Emergency Notes</h3>
        <textarea
          name="emergency_notes"
          value={form.emergency_notes || ""}
          onChange={handleChange}
          rows={3}
          placeholder="Any additional notes for responders..."
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Medical Info"}
      </Button>
    </div>
  );
}

// ── Main ProfileView ──────────────────────────────────────────────────────────
export default function ProfileView() {
  const { user: authUser } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id") || params.get("fID") || "1";
  const viewerEmail = params.get("userEmail");
  const urlUserName = params.get("UserName") || params.get("Name");
  const ownerParam = params.get("Owner") || params.get("owner") || params.get("OWNER");
  // Latch owner status once true so toggling edit mode doesn't reset it
  const [isOwner, setIsOwner] = useState(ownerParam?.toLowerCase() === "true");
  useEffect(() => { if (authUser || ownerParam?.toLowerCase() === "true") setIsOwner(true); }, [authUser]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // mode: 'display' | 'edit'
  const [mode, setMode] = useState("display");
  // display sub-view: 'overview' | 'wallet'
  const [displayTab, setDisplayTab] = useState("overview");
  // edit tab: 'contacts' | 'medical' | 'health'
  const [editTab, setEditTab] = useState("contacts");

  // Fusion getUser popup
  const [fusionOpen, setFusionOpen] = useState(false);
  const [fusionStatus, setFusionStatus] = useState("loading");
  const [fusionUser, setFusionUser] = useState(null);
  const [fusionError, setFusionError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      const bridge = window.FusionBridge;
      if (bridge && typeof bridge.getUser === "function") {
        clearInterval(timer);
        if (cancelled) return;
        setFusionOpen(true);
        setFusionStatus("loading");
        try {
          const result = await bridge.getUser();
          if (cancelled) return;
          setFusionUser(result);
          setFusionStatus("success");
        } catch (e) {
          if (cancelled) return;
          setFusionError(e?.message || "Could not retrieve user info.");
          setFusionStatus("error");
        }
      } else if (attempts > 40) {
        // ~16s: bridge never loaded (not embedded in Fusion) — give up silently
        clearInterval(timer);
      }
    }, 400);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const fetchProfile = () => {
    if (!profileId) { setError("No profile ID provided."); setLoading(false); return; }
    base44.functions.invoke("getPublicICEProfile", { profileId, userName: urlUserName })
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Could not load profile."); setLoading(false); });
  };

  useEffect(() => { fetchProfile(); }, [profileId]);

  function handleMedicalSaved(updatedFields) {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...updatedFields } }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
        <div>
          <Shield className="w-12 h-12 text-emergency mx-auto mb-3" />
          <p className="text-foreground text-lg font-semibold">Could Not Load Profile</p>
          <p className="text-muted-foreground text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { profile, contacts, allergies, conditions, medications, user, profileDbId } = data;
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  const isEditMode = mode === "edit";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FusionUserDialog
        open={fusionOpen}
        onClose={() => setFusionOpen(false)}
        status={fusionStatus}
        userData={fusionUser}
        error={fusionError}
      />
      {/* ── Fixed Header ── */}
      <div className="bg-primary sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
          </div>
          {isOwner && !isEditMode && (
            <Button size="sm" onClick={() => { setMode("edit"); setEditTab("contacts"); }}
              className="bg-white text-primary hover:bg-white/90 gap-1 text-xs font-semibold">
              <Pencil className="w-3 h-3" /> Edit Profile
            </Button>
          )}
          {isOwner && isEditMode && (
            <span className="text-white/70 text-xs font-medium">Editing Profile</span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-36">

        {/* DISPLAY MODE */}
        {!isEditMode && displayTab === "overview" && (
          <div className="space-y-4">
            <ProfileHeader user={user} profile={profile} contacts={sortedContacts} allergies={allergies} conditions={conditions} medications={medications} />
            <CriticalAlertsBanner alerts={[
              ...(profile.critical_alerts || []),
              ...allergies.filter(a => a.is_critical_alert).map(a => `${a.name}${a.severity ? ` · ${a.severity}` : ''} Allergy`),
              ...conditions.filter(c => c.is_critical_alert).map(c => c.name),
              ...medications.filter(m => m.is_critical_alert).map(m => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`),
            ]} />
            {sortedContacts.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-3">Emergency Contacts</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {sortedContacts.map((c) => (
                    <ContactCard key={c.id} contact={c} userName={user?.full_name} />
                  ))}
                </div>
              </div>
            )}
            <MedicalInfoDisplay allergies={allergies} conditions={conditions} medications={medications} />
            <DoctorHospitalInfo profile={profile} />
            {profile.emergency_notes && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <h3 className="font-semibold text-foreground text-sm mb-2">Emergency Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.emergency_notes}</p>
              </div>
            )}
          </div>
        )}

        {!isEditMode && displayTab === "wallet" && (
          <div className="space-y-6">
            <WalletCardPreview profile={profile} contacts={sortedContacts} user={user} />

            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Emergency QR Code</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                This QR code links to your ICE onQ profile. Attach it to your phone case, cycling helmet, medical bracelet, or wallet.
              </p>
              <div className="flex justify-center py-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/profile?fID=${profile.fusion_id || profileDbId}`)}&color=0F172A&bgcolor=FFFFFF`}
                    alt="ICE QR Code"
                    className="w-40 h-40"
                  />
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">Scan to access emergency information</div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <h3 className="font-semibold">Potential Uses</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Smartphone, label: "Phone lock screen" },
                  { icon: CreditCard, label: "Physical wallet card" },
                  { icon: "🚴", label: "Cycling ID tag" },
                  { icon: "🏃", label: "Running bib" },
                  { icon: "🏥", label: "Medical bracelet" },
                  { icon: "🚗", label: "Vehicle sticker" },
                ].map((use, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-sm">
                    {typeof use.icon === "string" ? (
                      <span className="text-lg">{use.icon}</span>
                    ) : (
                      <use.icon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-foreground">{use.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-2xl p-5 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">Coming Soon</p>
              <p className="text-xs text-muted-foreground">Apple Wallet · Google Wallet · Printable Card · NFC Tag Support</p>
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {isEditMode && editTab === "contacts" && (
          <ManageContacts profileId={profileDbId || profile?.id} />
        )}

        {isEditMode && editTab === "medical" && (
          <MedicalEditTab
            profile={profile}
            profileDbId={profileDbId}
            viewerEmail={viewerEmail}
            onSaved={handleMedicalSaved}
          />
        )}

        {isEditMode && editTab === "health" && (
          <HealthEditTab profileId={profileDbId || profile?.id} />
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      {!isEditMode && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex justify-around py-2 max-w-lg mx-auto">
            {window.__fusiononqBridge && (
              <button
                onClick={() => {
                  if (window.FusionBridge && typeof window.FusionBridge.closeComponent === "function") {
                    window.FusionBridge.closeComponent();
                  }
                  // Always send the raw message the host listens for, in case the
                  // bridge global failed to initialise or its target origin differs.
                  window.top.postMessage({ request: "closeComponent" }, "*");
                }}
                className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-emergency"
              >
                <X className="w-5 h-5" />
                <span className="text-[10px] font-medium">Close</span>
              </button>
            )}
            {[
              { id: "overview", label: "Overview", icon: LayoutDashboard },
              { id: "wallet", label: "Wallet Card", icon: WalletIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDisplayTab(id)}
                className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg transition-colors ${
                  displayTab === id ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {isEditMode && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex justify-around py-2 max-w-lg mx-auto">
            <button
              onClick={() => setEditTab("contacts")}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors ${
                editTab === "contacts" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-medium">Contacts</span>
            </button>
            <button
              onClick={() => setEditTab("medical")}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors ${
                editTab === "medical" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Info className="w-5 h-5" />
              <span className="text-[10px] font-medium">Info</span>
            </button>
            <button
              onClick={() => setEditTab("health")}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors ${
                editTab === "health" ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="text-base leading-none">💊</span>
              <span className="text-[10px] font-medium">Health</span>
            </button>
            <button
              onClick={() => { setMode("display"); fetchProfile(); }}
              className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[10px] font-medium">Back</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}