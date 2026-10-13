import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// The three steps of creating a new ICE record. Each maps to an existing
// edit tab in ProfileView: medical → contacts → health.
const STEPS = [
  {
    title: "Personal & Medical Details",
    hint: "Fill in the identity, medical aid, doctor and hospital details you know, then tap Save Medical Info.",
    savedHint: "Saved. Continue to emergency contacts.",
    nextLabel: "Next: Emergency Contacts",
  },
  {
    title: "Emergency Contacts",
    hint: "Add at least one person to contact in an emergency, then continue.",
    savedHint: "Contact saved. Continue to health information.",
    nextLabel: "Next: Health Information",
  },
  {
    title: "Health Information",
    hint: "Add allergies, chronic conditions and medications, then finish setup.",
    savedHint: "Saved. You can finish setup now.",
    nextLabel: "Finish Setup",
  },
];

export default function SetupStepBanner({ step, saved, onNext, onFinish }) {
  const current = STEPS[step - 1];
  if (!current) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Step {step} of 3</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{current.title}</p>
        </div>
        <div className="flex items-center gap-1.5 pt-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 <= step ? "w-6 bg-primary" : "w-3 bg-primary/25"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2">
        {saved && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />}
        <p className={`text-xs leading-relaxed ${saved ? "text-success font-medium" : "text-muted-foreground"}`}>
          {saved ? current.savedHint : current.hint}
        </p>
      </div>

      <Button onClick={step === 3 ? onFinish : onNext} className="w-full gap-2 h-10">
        {current.nextLabel} <ArrowRight className="w-4 h-4" />
      </Button>

      <p className="text-[10px] text-muted-foreground text-center">
        Don't have everything yet? You can skip ahead and come back to any step later.
      </p>
    </div>
  );
}