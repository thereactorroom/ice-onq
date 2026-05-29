import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Phone, MessageSquare, MessageCircle, AlertTriangle, Pill, Activity, Stethoscope, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

function cleanPhone(num) {
  return (num || "").replace(/[^+\d]/g, "");
}

export default function EmergencyAccess() {
  const params = new URLSearchParams(window.location.search);
  const profileId = params.get("id");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profileId) {
      setError("No profile ID provided.");
      setLoading(false);
      return;
    }
    base44.functions.invoke("getPublicICEProfile", { profileId })
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Could not load emergency profile."); setLoading(false); });
  }, [profileId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-white text-lg font-semibold">Profile Not Found</p>
          <p className="text-slate-400 text-sm mt-1">{error || "This ICE profile could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const { profile, contacts, allergies, conditions, medications, user } = data;
  const dob = profile.date_of_birth;
  const age = dob ? Math.floor((new Date() - new Date(dob)) / 31557600000) : null;
  const sorted = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return (a.priority || 0) - (b.priority || 0);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-8">
      <div className="bg-red-600 px-4 py-3 flex items-center gap-2">
        <Shield className="w-5 h-5 animate-pulse" />
        <span className="font-bold text-sm uppercase tracking-wider">ICE onQ — Emergency Medical Profile</span>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4 pt-4">
        <div className="bg-slate-900 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            {profile.profile_photo ? (
              <img src={profile.profile_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400">
                {(user?.full_name || "?")[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{user?.full_name || "Unknown"}</h1>
              <div className="flex flex-wrap gap-2 mt-1">
                {dob && <span className="text-sm text-slate-400">DOB: {new Date(dob).toLocaleDateString()}</span>}
                {age !== null && <span className="text-sm text-slate-400">Age: {age}</span>}
                {profile.blood_group && profile.blood_group !== "Unknown" && (
                  <span className="px-2 py-0.5 bg-red-600 rounded text-xs font-bold">{profile.blood_group}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {profile.critical_alerts?.length > 0 && (
          <div className="bg-red-900/60 border border-red-600 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              <h2 className="font-bold text-red-300 uppercase text-sm tracking-wider">Critical Medical Alerts</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.critical_alerts.map((a, i) => (
                <span key={i} className="px-3 py-1.5 bg-red-600/70 rounded-lg text-sm font-semibold">{a}</span>
              ))}
            </div>
          </div>
        )}

        {sorted.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-slate-300 uppercase text-xs tracking-wider">Emergency Contacts</h2>
            {sorted.map((c) => {
              const phone = cleanPhone(c.mobile);
              const waMsg = encodeURIComponent(`Emergency: I am with ${user?.full_name || "someone"}. Please call back urgently.`);
              return (
                <div key={c.id} className="bg-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-semibold">{c.full_name}</span>
                    {c.is_primary && <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded font-bold ml-1">PRIMARY</span>}
                  </div>
                  <p className="text-slate-400 text-sm mb-2">{c.relationship} · {c.mobile}</p>
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

        {(allergies.length > 0 || conditions.length > 0 || medications.length > 0) && (
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-slate-300 uppercase text-xs tracking-wider">Medical Information</h2>
            {allergies.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mb-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Allergies</div>
                <div className="flex flex-wrap gap-1.5">
                  {allergies.map((a) => (
                    <span key={a.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${a.is_critical_alert ? "bg-red-800 text-red-200" : "bg-slate-800 text-slate-300"}`}>
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
                    <span key={c.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${c.is_critical_alert ? "bg-red-800 text-red-200" : "bg-slate-800 text-slate-300"}`}>
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
                    <span key={m.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${m.is_critical_alert ? "bg-red-800 text-red-200" : "bg-slate-800 text-slate-300"}`}>
                      {m.name}{m.dosage && ` ${m.dosage}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(profile.medical_aid_name || profile.doctor_name || profile.hospital_name) && (
          <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-slate-300 uppercase text-xs tracking-wider">Healthcare Details</h2>
            {profile.medical_aid_name && (
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-medium">{profile.medical_aid_name}</p><p className="text-xs text-slate-400">Member: {profile.medical_aid_number || "—"}</p></div>
              </div>
            )}
            {profile.doctor_name && (
              <div className="flex items-start gap-2">
                <Stethoscope className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{profile.doctor_name}</p>
                  {profile.doctor_practice && <p className="text-xs text-slate-400">{profile.doctor_practice}</p>}
                  {profile.doctor_mobile && <a href={`tel:${cleanPhone(profile.doctor_mobile)}`} className="text-xs text-green-400 underline">{profile.doctor_mobile}</a>}
                </div>
              </div>
            )}
            {profile.hospital_name && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-medium">{profile.hospital_name}</p>{profile.hospital_location && <p className="text-xs text-slate-400">{profile.hospital_location}</p>}</div>
              </div>
            )}
          </div>
        )}

        {profile.emergency_notes && (
          <div className="bg-amber-900/40 border border-amber-700 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase mb-1">Emergency Notes</p>
            <p className="text-sm text-amber-100 whitespace-pre-wrap">{profile.emergency_notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-600 pt-2">ICE onQ · Emergency Medical Profile</p>
      </div>
    </div>
  );
}