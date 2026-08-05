import { useState, useEffect, useRef } from "react";
import { Phone, AlertTriangle, Heart, Zap, Wind, Droplets, Bone, Brain, ChevronRight, Loader2, Shield, X, Play, Square, Pause, User, ZoomIn, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const SITUATIONS = [
  { id: "cardiac", label: "Chest Pain / Heart Attack", icon: Heart, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { id: "allergic", label: "Allergic Reaction", icon: Zap, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  { id: "breathing", label: "Difficulty Breathing", icon: Wind, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  { id: "bleeding", label: "Severe Bleeding", icon: Droplets, color: "text-red-700", bg: "bg-red-50 border-red-200" },
  { id: "fracture", label: "Broken Bone / Fall", icon: Bone, color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  { id: "unconscious", label: "Unconscious / Unresponsive", icon: Brain, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  { id: "diabetic", label: "Diabetic Emergency", icon: AlertTriangle, color: "text-pink-600", bg: "bg-pink-50 border-pink-200" },
  { id: "stroke", label: "Possible Stroke", icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
];

const EMERGENCY_NUMBER = "082911";

function EmergencyCallButton() {
  return (
    <a
      href={`tel:${EMERGENCY_NUMBER}`}
      className="flex items-center justify-center gap-3 w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-base py-4 px-8 rounded-2xl shadow-lg transition-colors"
    >
      <Phone className="w-6 h-6 fill-white" />
      Call Emergency Services (082911)
    </a>
  );
}

function StepsList({ text }) {
  if (!text) return null;
  const numbered = text.match(/^\d+\.\s+.+$/gm);
  const steps = numbered && numbered.length > 1
    ? numbered.map(line => line.replace(/^\d+\.\s+/, '').trim())
    : text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm text-foreground leading-relaxed flex-1">{step}</p>
        </div>
      ))}
    </div>
  );
}

function SpeechControls({ text }) {
  const [speaking, setSpeaking] = useState(false);
  const [prefetching, setPrefetching] = useState(true);
  const audioRef = useRef(null);

  // Pre-fetch audio as soon as text is available
  useEffect(() => {
    if (!text) return;
    setPrefetching(true);
    base44.integrations.Core.GenerateSpeech({ text, voice: "river" })
      .then((res) => {
        const audio = new Audio(res.url);
        audio.preload = "auto";
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => setSpeaking(false);
        audioRef.current = audio;
        // Wait until enough is buffered before marking ready
        audio.addEventListener("canplaythrough", () => setPrefetching(false), { once: true });
        // Fallback in case canplaythrough doesn't fire (e.g. cached)
        setTimeout(() => setPrefetching(false), 4000);
      })
      .catch(() => setPrefetching(false));

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [text]);

  function startSpeaking() {
    if (!audioRef.current) return;
    audioRef.current.onended = () => setSpeaking(false);
    audioRef.current.play();
    setSpeaking(true);
  }

  function stopSpeaking() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeaking(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {!speaking ? (
          <button
            onClick={startSpeaking}
            disabled={prefetching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {prefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {prefetching ? "Preparing audio..." : "Read Aloud"}
          </button>
        ) : (
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop
          </button>
        )}
        {speaking && (
          <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Reading...
          </span>
        )}
      </div>

      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">First-Aid Steps</p>
        <StepsList text={text} />
      </div>
    </div>
  );
}

function AIAdvicePanel({ situation, profile, allergies, conditions, medications, onClose }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(true);

  // Auto-load guidance when the panel opens
  useEffect(() => {
    fetchAdvice();
  }, []);

  // Stop speech when panel closes
  function handleClose() {
    onClose();
  }

  async function fetchAdvice() {
    setLoading(true);
    setStarted(true);

    const medicalContext = [
      profile?.blood_group && profile.blood_group !== "Unknown" ? `Blood group: ${profile.blood_group}` : null,
      allergies?.length ? `Known allergies: ${allergies.map(a => a.name).join(", ")}` : null,
      conditions?.length ? `Chronic conditions: ${conditions.map(c => c.name).join(", ")}` : null,
      medications?.length ? `Current medications: ${medications.map(m => m.name).join(", ")}` : null,
      profile?.emergency_notes ? `Emergency notes: ${profile.emergency_notes}` : null,
    ].filter(Boolean).join(". ");

    const situationLabel = SITUATIONS.find(s => s.id === situation)?.label || situation;

    const prompt = `You are a calm, experienced emergency first-aid instructor. A bystander needs to help someone experiencing: "${situationLabel}".
${medicalContext ? `\nThe patient's medical background: ${medicalContext}.` : ""}

Write exactly 6 to 8 numbered first-aid steps. Format each step strictly as: "1. [Step text]." on its own line.
- Each step must be one complete, calm sentence written for spoken delivery.
- Use plain spoken English. No abbreviations, symbols, markdown, or extra headings — only the numbered lines.
- Note any relevant interactions with the patient's medical profile where applicable.
- The final step must remind the bystander to call emergency services if not already done.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setAdvice(res);
    } catch (err) {
      setAdvice("Unable to load advice right now. Please call emergency services immediately: 082911.");
    } finally {
      setLoading(false);
    }
  }

  const situationInfo = SITUATIONS.find(s => s.id === situation);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center px-4 pt-4 pb-20 sm:pb-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg h-full sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {situationInfo && <situationInfo.icon className={`w-5 h-5 ${situationInfo.color}`} />}
            <h3 className="font-bold text-foreground text-sm">{situationInfo?.label}</h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <EmergencyCallButton />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              AI guidance is based on general first-aid protocols and is <strong>not a substitute</strong> for professional medical assessment. Always call emergency services first.
            </p>
          </div>

          {loading && (
            <Button disabled className="w-full gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading first aid guidance
            </Button>
          )}

          {advice && !loading && (
            <SpeechControls text={advice} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function HelpView({ profile, allergies, conditions, medications, onGoToDetails }) {
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [enlarged, setEnlarged] = useState(false);

  return (
    <div className="space-y-4 pb-4">
      {/* Profile identity — compact, expandable photo + name. Tapping the card
          opens the Details tab; tapping the photo still enlarges it. */}
      {profile && (
        <div className="bg-card rounded-2xl border border-border p-3">
          {enlarged && profile.profile_photo && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setEnlarged(false)}
            >
              <img
                src={profile.profile_photo}
                alt={profile.display_name || "Profile photo"}
                className="w-80 h-80 rounded-2xl object-cover shadow-2xl border-4 border-white"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => onGoToDetails && onGoToDetails()}
            disabled={!onGoToDetails}
            className="w-full flex items-center gap-3 text-left rounded-xl transition-colors hover:bg-primary/5 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <div
              className={`relative w-14 h-14 flex-shrink-0 ${profile.profile_photo ? "cursor-pointer" : ""}`}
              onClick={(e) => { if (profile.profile_photo) { e.stopPropagation(); setEnlarged(true); } }}
              title={profile.profile_photo ? "Tap to enlarge" : undefined}
            >
              <div className="w-14 h-14 rounded-full bg-muted border-2 border-border overflow-hidden flex items-center justify-center">
                {profile.profile_photo ? (
                  <img src={profile.profile_photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              {profile.profile_photo && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                  <ZoomIn className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground truncate">
                {profile.display_name || "Unknown"}
              </h2>
              {profile.date_of_birth && (() => {
                const dob = new Date(profile.date_of_birth);
                const age = Math.floor((new Date() - dob) / 31557600000);
                return (
                  <p className="text-xs text-muted-foreground">
                    DOB: {dob.getFullYear()}/{String(dob.getMonth() + 1).padStart(2, "0")}/{String(dob.getDate()).padStart(2, "0")}
                    {age >= 0 && <span className="ml-2">Age: {age}</span>}
                  </p>
                );
              })()}
              {onGoToDetails && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  Click to view full details <ChevronLeft className="w-3 h-3 rotate-180" />
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      <div className="bg-card rounded-2xl border-2 border-red-200 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Phone className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-foreground text-sm">Emergency Call</h3>
        </div>
        <p className="text-xs text-muted-foreground">If this is a life-threatening emergency, call immediately.</p>
        <EmergencyCallButton />
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-sm">First-Aid Advisor</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Select the situation below. The AI will provide immediate first-aid steps personalised to this profile's medical history.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {SITUATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSituation(s.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:scale-[1.01] ${s.bg}`}
            >
              <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
              <span className={`text-sm font-medium flex-1 ${s.color}`}>{s.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {selectedSituation && (
        <AIAdvicePanel
          situation={selectedSituation}
          profile={profile}
          allergies={allergies}
          conditions={conditions}
          medications={medications}
          onClose={() => setSelectedSituation(null)}
        />
      )}
    </div>
  );
}