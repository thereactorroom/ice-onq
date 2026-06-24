import { useState } from "react";
import { Phone, AlertTriangle, Heart, Zap, Wind, Droplets, Bone, Brain, ChevronRight, Loader2, Shield, X } from "lucide-react";
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

const EMERGENCY_NUMBER = "112";

function EmergencyCallButton() {
  return (
    <a
      href={`tel:${EMERGENCY_NUMBER}`}
      className="flex items-center justify-center gap-3 w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-base py-4 rounded-2xl shadow-lg transition-colors"
    >
      <Phone className="w-6 h-6 fill-white" />
      Call Emergency Services (112)
    </a>
  );
}

function AIAdvicePanel({ situation, profile, allergies, conditions, medications, onClose }) {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

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

    const prompt = `You are an emergency first-aid assistant. A person is experiencing: "${situationLabel}".
${medicalContext ? `\nThe patient's medical profile includes the following: ${medicalContext}.` : ""}

Provide clear, calm, numbered first-aid steps that a bystander can follow immediately while waiting for emergency services. 
- Keep each step short and actionable.
- Flag any specific interactions with the patient's medical profile if relevant.
- End with a reminder to call emergency services if not already done.
- Maximum 8 steps. Plain language only. No markdown headers.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setAdvice(res);
    } catch (err) {
      setAdvice("Unable to load advice right now. Please call emergency services immediately: 112.");
    } finally {
      setLoading(false);
    }
  }

  const situationInfo = SITUATIONS.find(s => s.id === situation);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {situationInfo && <situationInfo.icon className={`w-5 h-5 ${situationInfo.color}`} />}
            <h3 className="font-bold text-foreground text-sm">{situationInfo?.label}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
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

          {!started && (
            <Button onClick={fetchAdvice} className="w-full gap-2" variant="outline">
              <Shield className="w-4 h-4" />
              Get First-Aid Guidance
            </Button>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating guidance...</span>
            </div>
          )}

          {advice && !loading && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">First-Aid Steps</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{advice}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HelpView({ profile, allergies, conditions, medications }) {
  const [selectedSituation, setSelectedSituation] = useState(null);

  return (
    <div className="space-y-4 pb-4">
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