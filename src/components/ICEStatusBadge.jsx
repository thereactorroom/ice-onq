import { useState } from "react";
import { CheckCircle, AlertTriangle, AlertCircle, X } from "lucide-react";

function getCompletionItems(profile, contacts, allergies, conditions, medications) {
  return [
    {
      key: "contacts",
      label: "Emergency contact",
      done: contacts.length > 0,
      editTab: "contacts",
    },
    {
      key: "medical",
      label: "Medical aid details",
      done: !!profile?.medical_aid_name,
      editTab: "medical",
    },
    {
      key: "doctor",
      label: "Doctor information",
      done: !!profile?.doctor_name,
      editTab: "medical",
    },
    {
      key: "health",
      label: "Allergies, conditions or medications",
      done: allergies.length > 0 || conditions.length > 0 || medications.length > 0,
      editTab: "health",
    },
  ];
}

export default function ICEStatusBadge({ profile, contacts = [], allergies = [], conditions = [], medications = [], isOwner, onNavigateEdit }) {
  const [showPopup, setShowPopup] = useState(false);

  const items = getCompletionItems(profile, contacts, allergies, conditions, medications);
  const completed = items.filter((i) => i.done).length;
  const total = items.length;

  const isComplete = completed === total;
  const isPartial = completed >= 2;

  const badge = isComplete ? (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold whitespace-nowrap">
      <CheckCircle className="w-3.5 h-3.5" />
      Complete
    </div>
  ) : isPartial ? (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-semibold whitespace-nowrap">
      <AlertTriangle className="w-3.5 h-3.5" />
      Partial
    </div>
  ) : (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5" />
      Incomplete
    </div>
  );

  if (!isOwner || isComplete) return badge;

  return (
    <div className="relative">
      <button onClick={() => setShowPopup(true)} className="focus:outline-none">
        {badge}
      </button>

      {showPopup && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setShowPopup(false)} />

          {/* Popup */}
          <div className="absolute right-0 top-8 z-50 w-64 bg-card border border-border rounded-2xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Profile Completion</p>
              <button onClick={() => setShowPopup(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{completed}/{total} sections complete</p>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${
                    item.done
                      ? "bg-success/5 text-success"
                      : "bg-muted/60 text-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                  }`}
                  onClick={() => {
                    if (!item.done && onNavigateEdit) {
                      setShowPopup(false);
                      onNavigateEdit(item.editTab);
                    }
                  }}
                >
                  {item.done ? (
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-warning" />
                  )}
                  <span>{item.label}</span>
                  {!item.done && <span className="ml-auto text-[10px] text-primary font-medium">Add →</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}