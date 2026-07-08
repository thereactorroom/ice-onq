import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getGlobalBridge } from "@/lib/fusionBridge";
import { base44 } from "@/api/base44Client";
import { Shield, Pencil, ArrowLeft, Users, Info, LayoutDashboard, CreditCard as WalletIcon, Save, X, QrCode, Smartphone, CreditCard, Upload, User, AlertTriangle, Trash2, HelpCircle, RefreshCw } from "lucide-react";
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
import ProfileHeader from "../components/ProfileHeader";
import CriticalAlertsBanner from "../components/CriticalAlertsBanner";
import ContactCard from "../components/ContactCard";
import MedicalInfoDisplay from "../components/MedicalInfoDisplay";
import DoctorHospitalInfo from "../components/DoctorHospitalInfo";
import WalletCardPreview from "../components/WalletCardPreview";
import SharingView from "./SharingView";
import ManageContacts from "./ManageContacts";
import HealthEditTab from "../components/HealthEditTab";
import InitiationScreen from "../components/InitiationScreen";
import ProfileSelectorScreen from "../components/ProfileSelectorScreen";
import DateInput from "../components/DateInput";
import ProfileViewSkeleton from "../components/ProfileViewSkeleton";
import HelpView from "../components/HelpView.jsx";
import AcceptInviteScreen from "../components/AcceptInviteScreen.jsx";
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

// ── Image compression utility ─────────────────────────────────────────────────
function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ── MedicalEditTab ────────────────────────────────────────────────────────────
function MedicalEditTab({ profile, profileDbId, viewerEmail, onSaved, onBack, onRegisterBack }) {
  const [form, setForm] = useState({ ...profile });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const dirtyRef = useRef(false);

  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  useEffect(() => {
    onRegisterBack(() => {
      if (dirtyRef.current) {
        setShowBackDialog(true);
      } else {
        onBack();
      }
    });
  }, [onRegisterBack, onBack]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const compressed = await compressImage(file);
      const result = await base44.integrations.Core.UploadFile({ file: compressed });
      const now = new Date().toISOString();
      setForm((prev) => ({ ...prev, profile_photo: result.file_url, profile_photo_updated: now }));
      setDirty(true);
    } catch (err) {
      console.error("Photo upload failed:", err);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await base44.functions.invoke("updatePublicICEProfile", {
        profileId: profileDbId,
        updates: form,
      });
      setDirty(false);
      setSaving(false);
      onSaved(form);
      return true;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || "Unknown error";
      setSaveError(msg);
      setSaving(false);
      return false;
    }
  }

  return (
    <div className="space-y-4 pb-36">
      {/* Name */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 -mt-1">
          <span className="text-amber-500 text-base leading-none flex-shrink-0 mt-0.5">⚠️</span>
          <p className="text-xs text-amber-900 leading-relaxed">
            A <strong>clear, recent photo</strong> is critical for emergency identification by first responders.
          </p>
        </div>

        {/* Profile Photo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
            {form.profile_photo ? (
              <img src={form.profile_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:bg-primary/90 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              {uploadingPhoto ? "Uploading..." : form.profile_photo ? "Change Photo" : "Upload Photo"}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
            </label>
            <p className="text-[10px] text-muted-foreground">Images are automatically resized to 400×400</p>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-medium ${form.profile_photo_updated ? "text-muted-foreground" : "text-warning"}`}>
                {form.profile_photo_updated
                  ? `Last reviewed: ${new Date(form.profile_photo_updated).toLocaleDateString("en-CA").replace(/-/g, "/")}`
                  : "Not yet reviewed"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date().toISOString();
                  setForm((prev) => ({ ...prev, profile_photo_updated: now }));
                  setDirty(true);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200 text-[10px] font-semibold transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Mark as Reviewed
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name (Medical)" name="display_name" value={form.display_name} onChange={handleChange} span2 placeholder="Legal / medical name" />
          <p className="col-span-2 text-xs text-muted-foreground -mt-1">This name is used on all medical and emergency records.</p>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Date of Birth</label>
            <DateInput value={form.date_of_birth || ""} onChange={(v) => { setForm((prev) => ({ ...prev, date_of_birth: v })); setDirty(true); }} />
          </div>
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

      {saveError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Medical Info"}
      </Button>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={showBackDialog} onOpenChange={(open) => {
        if (!open) setShowBackDialog(false);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="outline" onClick={() => { setShowBackDialog(false); setDirty(false); onBack(); }}>
              Discard
            </Button>
            <Button
              onClick={async (e) => {
                e.preventDefault();
                const ok = await handleSave();
                if (ok) {
                  setShowBackDialog(false);
                  onBack();
                }
              }}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              Save & Exit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── DeleteProfileSection ──────────────────────────────────────────────────────
function DeleteProfileSection({ profileDbId, displayName, guardianFid, onDeleted }) {
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <div className="border-t border-border pt-4 mt-2 pb-2">
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete this ICE profile
        </button>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ICE Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate <strong>{displayName || "this profile"}</strong>. Anyone scanning the QR code will see a "Profile Deleted" message. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await base44.functions.invoke("updatePublicICEProfile", {
                  profileId: profileDbId,
                  updates: { is_deleted: true, deleted_at: new Date().toISOString() },
                });
                setDeleting(false);
                setShowDialog(false);
                onDeleted();
              }}
            >
              {deleting ? "Deleting..." : "Yes, Delete Profile"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main ProfileView ──────────────────────────────────────────────────────────
export default function ProfileView() {
  const { user: authUser } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const rawFID = params.get("fID");
  const isDevMode = params.get("DevMode") === "True";
  const slugParam = params.get("s"); // public_slug based share link
  const guardianFid = params.get("guardianFid");
  const showSelector = params.get("showSelector") === "true";
  const isDbId = params.get("isDbId") === "true";
  const acceptInviteToken = params.get("acceptInvite");

  // Launch parameter routing:
  // Launch=New  → Initiation screen (default)
  // Launch=View → Profile in read-only/view mode
  // Launch=Profile → Profile with owner/edit access
  // Missing/blank/unrecognized → defaults to New (Initiation)
  const launchParam = params.get("Launch");
  const ownerParam = params.get("Owner") || params.get("owner") || params.get("OWNER");

  let launchMode;
  if (["New", "View", "Profile"].includes(launchParam)) {
    launchMode = launchParam;
  } else {
    // If a slug or fID is present, default to View; only default to New if nothing is provided
    launchMode = (rawFID && rawFID !== "0") || slugParam ? "View" : "New";
  }

  // Declare ownerExplicitlyFalse before isSelectorMode so it can be used in that check
  const ownerExplicitlyFalse = ownerParam?.toLowerCase() === "false";

  // Launch=Profile with fID > 0 and Owner=true → show the Profile Selector screen
  const isSelectorMode =
    launchParam === "Profile" &&
    !!rawFID && rawFID !== "0" &&
    ownerParam?.toLowerCase() === "true" &&
    !ownerExplicitlyFalse;

  // No fID/slug/invite → show intro screen (demo, login, register). No auto-creation.
  const isInitiationMode = !rawFID && !slugParam && !acceptInviteToken;
  // fID=0 → demo profile (read-only)
  const isDemoMode = rawFID === "0";
  const profileId = rawFID || "0";
  const viewerEmail = params.get("userEmail");
  const urlUserName = params.get("UserName") || params.get("Name");
  const [isFusionIframe, setIsFusionIframe] = useState(false);
  const [fusionUser, setFusionUser] = useState(null);
  const [fusionHost, setFusionHost] = useState(null);
  const [fusionReady, setFusionReady] = useState(false);
  const [detectionDone, setDetectionDone] = useState(false);
  // Launch=Profile → treat as owner; Launch=View → display mode, but Owner=True can still enable editing
  const launchForcesOwner = launchParam === "Profile" && !ownerExplicitlyFalse;
  const launchForcesView  = launchParam === "View" && ownerParam?.toLowerCase() !== "true";
  const [isOwner, setIsOwner] = useState(
    !ownerExplicitlyFalse && !launchForcesView && (launchForcesOwner || ownerParam?.toLowerCase() === "true")
  );
  // Track if this is a brand-new profile (first-time user → auto edit mode)
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [activeFid, setActiveFid] = useState(profileId);

  useEffect(() => {
    if (isDemoMode || isInitiationMode || launchForcesView || ownerExplicitlyFalse) return;
    // [DISABLED] Ownership inference via authUser — now controlled by URL params only
    // if (launchForcesOwner || authUser || ownerParam?.toLowerCase() === "true") setIsOwner(true);
    if (launchForcesOwner || ownerParam?.toLowerCase() === "true") setIsOwner(true);
  }, [authUser, launchForcesOwner, launchForcesView, ownerExplicitlyFalse]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // mode: 'display' | 'edit'
  const [mode, setMode] = useState("display");
  // display sub-view: 'overview' | 'wallet'
  const [displayTab, setDisplayTab] = useState("overview");

  function setDisplayTabScrollTop(tab) {
    setDisplayTab(tab);
    window.scrollTo({ top: 0 });
  }
  // edit tab: 'contacts' | 'medical' | 'health'
  const [editTab, setEditTab] = useState("medical");
  const medicalBackHandler = useRef(null);
  const hasAutoOpenedEdit = useRef(false);

  useEffect(() => {
    // No fID = initiation mode; skip fusion detection entirely
    if (isInitiationMode) return;
    // Selector mode: no fusion detection needed
    if (isSelectorMode) { setDetectionDone(true); return; }

    const isIframe = window.self !== window.top;

    let hostname = "";
    if (isIframe) {
      try {
        hostname = window.parent.location.hostname;
      } catch {
        try {
          const ref = new URL(document.referrer);
          hostname = ref.hostname;
        } catch { /* unknown */ }
      }
    }

    const isFusion = hostname.endsWith("fusiononq.com");

    if (isIframe && isFusion) {
      const host = hostname.includes("uat") ? "https://uat.fusiononq.com" : "https://app.fusiononq.com";
      const session = new URLSearchParams(window.location.search).get("session");

      if (session) {
        setIsFusionIframe(true);
        setFusionHost(host);
        base44.functions.invoke("getFusionUser", { host, session })
          .then((res) => {
            const userData = res.data.user;
            console.log("[FusionBridge] getUser:", userData);
            setFusionUser(userData);
            // [DISABLED] Ownership inference via fID/userId comparison — now controlled by URL params
            // const fID = new URLSearchParams(window.location.search).get("fID");
            // if (fID && String(userData?.userId) === fID && !ownerExplicitlyFalse) {
            //   setIsOwner(true);
            // }
            setFusionReady(true);
            setDetectionDone(true);
          })
          .catch((e) => {
            console.error("[FusionBridge] getUser error:", e?.response?.data?.error || e?.message);
            setFusionReady(true);
            setDetectionDone(true);
          });
        return;
      }
    }

    setDetectionDone(true);
  }, []);

  const fetchProfile = (forDemo = false) => {
    const pid = forDemo ? "0" : profileId;
    const payload = { profileId: pid, userName: urlUserName };
    if (!forDemo && slugParam) payload.slug = slugParam;
    if (!forDemo && isDbId) payload.isDbId = true;
    if (!forDemo && isFusionIframe && fusionUser) {
      payload.fusionUser = fusionUser;
      payload.fusionHost = fusionHost;
    }
    base44.functions.invoke("getPublicICEProfile", payload)
      .then((res) => {
        const result = res.data;
        setData(result);
        setLoading(false);

        // [DISABLED] All ownership inference — now controlled by URL params only
        // if (!forDemo && !ownerExplicitlyFalse && result.profile && result.isOwner) {
        //   setIsOwner(true);
        // }

        // Auto-open edit mode only for brand-new dependents (newProfile=true in URL)
        if (!forDemo && result.profile && !hasAutoOpenedEdit.current) {
          const isNewlyCreated = params.get("newProfile") === "true";
          if (isNewlyCreated) {
            hasAutoOpenedEdit.current = true;
            setIsNewProfile(true);
            setMode("edit");
          }
        }
      })
      .catch(() => { setError("Could not load profile."); setLoading(false); });
  };

  // Wait for fusion detection to complete before fetching
  useEffect(() => {
    // Selector mode: no profile fetch needed — just show the selector
    if (isSelectorMode) { setLoading(false); return; }
    // Initiation mode: don't fetch anything until user chooses View Demo
    if (isInitiationMode && !showDemo) { setLoading(false); return; }
    if (showDemo) { fetchProfile(true); return; }
    if (detectionDone && (!isFusionIframe || fusionReady)) fetchProfile();
  }, [profileId, detectionDone, isFusionIframe, fusionReady, showDemo]);

  function handleMedicalSaved(updatedFields) {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...updatedFields } }));
  }

  function switchProfile(targetFid) {
    console.log("[FusionBridge] Jumping to profile:", targetFid);
    setActiveFid(targetFid);
    setData(null);
    setLoading(true);
    // Switching profiles = viewing, not owning — clear owner status
    setIsOwner(false);
    const payload = { profileId: targetFid, userName: urlUserName };
    if (isFusionIframe && fusionUser) {
      payload.fusionUser = fusionUser;
      payload.fusionHost = fusionHost;
    }
    base44.functions.invoke("getPublicICEProfile", payload)
      .then((res) => {
        const result = res.data;
        setData(result);
        setLoading(false);

        // [DISABLED] All ownership inference — now controlled by URL params only
        // if (!ownerExplicitlyFalse && result.profile && result.isOwner) {
        //   setIsOwner(true);
        // }
      })
      .catch(() => { setError("Could not load profile."); setLoading(false); });
  }

  // ── FusionBridge listener: jump to a profile when host sends { jump: "fusionId" } ──
  function handleBridgeEvent(raw) {
    console.log("[FusionBridge] Received event:", raw);
    let data = raw;
    // Unwrap MessageEvent
    if (raw?.data !== undefined) data = raw.data;
    // Unwrap detail (CustomEvent)
    if (data?.detail !== undefined) data = data.detail;
    // Parse JSON string
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { /* not JSON */ }
    }
    if (data && typeof data === "object" && data.jump) {
      switchProfile(String(data.jump));
    }
  }

  useEffect(() => {
    if (!isFusionIframe) return;

    // 1) Register with FusionBridge.listener (host may call callback directly)
    const fusionBridge = getGlobalBridge("FusionBridge");
    if (fusionBridge && typeof fusionBridge.listener === "function") {
      console.log("[FusionBridge] Registering listener");
      fusionBridge.listener(handleBridgeEvent);
    }

    // 2) Also listen for postMessage — the host may deliver data through window messages
    window.addEventListener("message", handleBridgeEvent);

    return () => window.removeEventListener("message", handleBridgeEvent);
  }, [isFusionIframe, fusionUser, fusionHost, urlUserName]);

  // ── Accept Guardian Invite Mode ──
  if (acceptInviteToken) {
    return <AcceptInviteScreen token={acceptInviteToken} fusionUser={fusionUser} authUser={authUser} />;
  }

  // ── Profile Selector Mode: Launch=Profile with an fID ──
  if (isSelectorMode) {
    const devModeParam = isDevMode ? "&DevMode=True" : "";
    return (
      <ProfileSelectorScreen
        guardianFid={rawFID}
        onBack={() => window.history.back()}
        onSelect={(result) => {
          const guardianParam = `&guardianFid=${rawFID}`;
          const dbIdParam = result.isDbId ? "&isDbId=true" : "";
          const newProfileParam = result.newProfile ? "&newProfile=true" : "";
          // Launch=View shows display/overview mode; Owner=True enables the Edit Profile button
          // newProfile=true triggers auto-open edit mode for just-created profiles
          window.location.href = `/profile?fID=${result.fID}&Launch=View&Owner=True${guardianParam}${dbIdParam}${newProfileParam}${devModeParam}`;
        }}
      />
    );
  }

  // ── Profile Selector Mode: returning from a dependent profile ──
  if (showSelector && rawFID) {
    return (
      <ProfileSelectorScreen
        guardianFid={rawFID}
        onBack={() => window.location.href = "/profile"}
        onSelect={(result) => {
          const guardianParam = `&guardianFid=${rawFID}`;
          const dbIdParam = result.isDbId ? "&isDbId=true" : "";
          window.location.href = `/profile?fID=${result.fID}&Launch=Profile${guardianParam}${dbIdParam}`;
        }}
      />
    );
  }

  // ── Initiation Mode: no fID supplied ──
  if (isInitiationMode && !showDemo) {
    return <InitiationScreen onViewDemo={() => { setLoading(true); setShowDemo(true); }} />;
  }



  if (loading) {
    return <ProfileViewSkeleton />;
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

  if (data.isDeleted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary sticky top-0 z-50 shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pt-16 pb-36 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">ICE Profile Deleted</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            This ICE profile has been permanently deleted by the owner and is no longer active.
          </p>
        </div>
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex justify-around py-2 max-w-lg mx-auto">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else if (guardianFid) {
                  window.location.href = `/profile?fID=${guardianFid}&Launch=Profile&Owner=True`;
                } else {
                  window.location.href = "/profile";
                }
              }}
              className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[10px] font-medium">Back</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  if (data.notFound || !data.profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-primary sticky top-0 z-50 shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pt-16 pb-36 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No ICE Profile Found</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            This user hasn't set up their emergency profile yet. Please ask them to create one through their community member profile.
          </p>
        </div>
        {window.__fusiononqBridge && (
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
            <div className="flex justify-around py-2 max-w-lg mx-auto">
              <button
                onClick={() => {
                  if (window.FusionBridge && typeof window.FusionBridge.closeComponent === "function") {
                    window.FusionBridge.closeComponent();
                  }
                  window.top.postMessage({ request: "closeComponent" }, "*");
                }}
                className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-emergency"
              >
                <X className="w-5 h-5" />
                <span className="text-[10px] font-medium">Close</span>
              </button>
            </div>
          </nav>
        )}
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
      {/* ── Fixed Header ── */}
      <div className="bg-primary sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
          </div>
          {isOwner && !isEditMode && (
            <Button size="sm" onClick={() => { setMode("edit"); setEditTab("medical"); }}
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
            <ProfileHeader user={user} profile={profile} contacts={sortedContacts} allergies={allergies} conditions={conditions} medications={medications} isOwner={isOwner} onNavigateEdit={(tab) => { setMode("edit"); setEditTab(tab); window.scrollTo({ top: 0 }); }} profileDbId={profileDbId} onProfileUpdated={handleMedicalSaved} />



            <CriticalAlertsBanner alerts={[...new Set([
              ...(profile.critical_alerts || []),
              ...allergies.filter(a => a.is_critical_alert).map(a => `${a.name}${a.severity ? ` · ${a.severity}` : ''} Allergy`),
              ...conditions.filter(c => c.is_critical_alert).map(c => c.name),
              ...medications.filter(m => m.is_critical_alert).map(m => `${m.name}${m.dosage ? ` ${m.dosage}` : ''}`),
            ])]} />
            {activeFid === "127" && (
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <h3 className="font-bold text-foreground text-sm">Bridge Test</h3>
                <button
                  onClick={() => {
                    const uri = "https://api.whatsapp.com/send/?phone=27727852417";
                    const fusionBridge = getGlobalBridge("FusionBridge");
                    const nativeBridge = getGlobalBridge("NativeBridge");
                    console.log("[Bridge Debug] FusionBridge available:", !!fusionBridge);
                    console.log("[Bridge Debug] NativeBridge available:", !!nativeBridge);
                    if (fusionBridge && typeof fusionBridge.openWhatsApp === "function") {
                      console.log("[Bridge Debug] Calling FusionBridge.openWhatsApp:", uri);
                      fusionBridge.openWhatsApp(uri);
                    } else if (nativeBridge && typeof nativeBridge.openWhatsApp === "function") {
                      console.log("[Bridge Debug] Calling NativeBridge.openWhatsApp:", { uri });
                      nativeBridge.openWhatsApp({ uri });
                    } else {
                      console.log("[Bridge Debug] No bridge found, using postMessage fallback");
                      window.top.postMessage({ request: "openWhatsApp", payload: { uri } }, "*");
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => switchProfile("32")}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Switch
                </button>
              </div>
            )}
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
            <MedicalInfoDisplay allergies={allergies} conditions={conditions} medications={medications} profile={profile} />
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
          <SharingView profile={profile} contacts={sortedContacts} user={user} profileDbId={profileDbId} />
        )}

        {!isEditMode && displayTab === "help" && (
          <HelpView profile={profile} allergies={allergies} conditions={conditions} medications={medications} />
        )}

        {/* EDIT MODE */}
        {isEditMode && editTab === "contacts" && (
          <ManageContacts profileId={profileDbId || profile?.id} fusionUserId={fusionUser?.userId} />
        )}

        {isEditMode && editTab === "medical" && (
          <MedicalEditTab
            profile={profile}
            profileDbId={profileDbId}
            viewerEmail={viewerEmail}
            onSaved={handleMedicalSaved}
            onBack={() => { setMode("display"); fetchProfile(); }}
            onRegisterBack={(fn) => { medicalBackHandler.current = fn; }}
          />
        )}

        {isEditMode && editTab === "health" && (
          <HealthEditTab
            profileId={profileDbId || profile?.id}
            profileDbId={profileDbId}
            reviewedDates={{
              allergies_reviewed_date: profile?.allergies_reviewed_date,
              conditions_reviewed_date: profile?.conditions_reviewed_date,
              medications_reviewed_date: profile?.medications_reviewed_date,
            }}
            onReviewed={(field, value) => handleMedicalSaved({ [field]: value })}
          />
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      {!isEditMode && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex justify-around py-2 max-w-lg mx-auto">
            {isInitiationMode && showDemo && (
              <button
                onClick={() => { setShowDemo(false); setData(null); setLoading(false); }}
                className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-[10px] font-medium">Back</span>
              </button>
            )}
            {guardianFid && !isInitiationMode && (
              <button
                onClick={() => window.location.href = `/profile?fID=${guardianFid}&owner=true&showSelector=true`}
                className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-[10px] font-medium">Profiles</span>
              </button>
            )}
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
              { id: "wallet", label: "Share", icon: WalletIcon },
              { id: "help", label: "Help", icon: HelpCircle, accent: true },
            ].map(({ id, label, icon: Icon, accent }) => (
              <button
                key={id}
                onClick={() => setDisplayTabScrollTop(id)}
                className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-lg transition-colors ${
                  accent
                    ? "text-red-600 bg-red-50"
                    : displayTab === id
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary"
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
              onClick={() => {
                if (editTab === "medical" && medicalBackHandler.current) {
                  medicalBackHandler.current();
                } else {
                  setMode("display"); fetchProfile();
                }
              }}
              className="flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-[10px] font-medium">Back</span>
            </button>
            <button
              onClick={() => setEditTab("medical")}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors ${
                editTab === "medical" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Info className="w-5 h-5" />
              <span className="text-[10px] font-medium">Info</span>
            </button>
            <button
              onClick={() => setEditTab("contacts")}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors ${
                editTab === "contacts" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-medium">Contacts</span>
            </button>
            <button
              onClick={() => setEditTab("health")}
              className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-lg transition-colors ${
                editTab === "health" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="text-base leading-none">💊</span>
              <span className="text-[10px] font-medium">Health</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}