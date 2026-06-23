import { useState } from "react";
import { Shield, Heart, Phone, AlertTriangle, Pill, UserCheck, Lock, Play, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginFlow from "./LoginFlow";
import CreateProfileFlow from "./CreateProfileFlow";

export default function InitiationScreen({ onViewDemo }) {
  const [showLogin, setShowLogin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  if (showLogin) {
    return (
      <LoginFlow
        onBack={() => setShowLogin(false)}
        onSuccess={(result) => {
          if (result.addDependent) {
            // User chose "Add Dependent" from the profile selector — launch create flow as guardian
            setShowLogin(false);
            setShowCreate(true);
          } else {
            const guardianParam = result.guardianFid ? `&guardianFid=${result.guardianFid}` : "";
            const dbIdParam = result.isDbId ? "&isDbId=true" : "";
            window.location.href = `/profile?fID=${result.fID}&owner=${result.owner}${guardianParam}${dbIdParam}`;
          }
        }}
      />
    );
  }

  if (showCreate) {
    return <CreateProfileFlow onBack={() => setShowCreate(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-primary shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-white" />
            <div>
              <div className="font-bold text-white tracking-wider leading-none">ICE onQ</div>
              <div className="text-white/70 text-xs mt-0.5">In Case of Emergency</div>
            </div>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="text-white text-sm font-semibold px-3 py-1.5 rounded-lg border border-white/40 hover:bg-white/10 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center py-4 space-y-3">
          <div className="w-20 h-20 rounded-full bg-emergency/10 flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 text-emergency" />
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            Your emergency information available when it matters most.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Emergencies happen when we least expect them. ICE onQ allows you to create a secure emergency profile containing information that may help someone assist you if you cannot speak for yourself.
          </p>
          <p className="text-sm text-muted-foreground font-medium">You control what information is made available.</p>
        </div>

        {/* What your profile can include */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Your ICE profile can include:</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Phone, label: "Emergency contacts" },
              { icon: AlertTriangle, label: "Critical medical alerts" },
              { icon: "🌿", label: "Allergies" },
              { icon: Pill, label: "Current medications" },
              { icon: UserCheck, label: "Medical aid details" },
              { icon: "🩺", label: "Doctor information" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 text-sm">
                {typeof item.icon === "string" ? (
                  <span className="text-base">{item.icon}</span>
                ) : (
                  <item.icon className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <span className="text-foreground text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your privacy is protected</p>
            <p className="text-xs text-muted-foreground mt-1">
              ICE only shares the emergency information you choose. Your complete Health onQ medical record remains private.
            </p>
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-3 pb-6">
          {/* Demo Card */}
          <button
            onClick={onViewDemo}
            className="w-full flex items-center gap-4 bg-orange-500 border-2 border-orange-600 rounded-2xl p-5 text-left shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">See a Demo Profile in Action</p>
              <p className="text-xs text-white/80 mt-0.5">Explore a sample ICE profile before creating yours</p>
            </div>
          </button>

          {/* Create Card */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-4 bg-primary border-2 border-primary rounded-2xl p-5 text-left shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Create Your Free ICE Profile</p>
              <p className="text-xs text-white/80 mt-0.5">Securely powered by fusion onQ</p>
            </div>
          </button>

          <p className="text-xs text-muted-foreground text-center pt-1">Already have fusion onQ? Sign in above to activate or manage your ICE profile.</p>
        </div>
      </div>
    </div>
  );
}