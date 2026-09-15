import { useState } from "react";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

// Registration form shown after an OTP-verified mobile number that is not
// yet on fusion onQ — creates the fusion account via the fusionRegister
// proxy and hands the new fusion user back to the caller.
export default function FusionRegisterForm({ mobile, onRegistered }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = firstName.trim() && lastName.trim() && passwordsMatch && agreed && !loading;

  function handleRegister() {
    setError("");
    setLoading(true);
    base44.functions.invoke("fusionRegister", {
      mobile,
      name: firstName.trim(),
      surname: lastName.trim(),
      password,
    })
      .then((res) => {
        const data = res.data;
        setLoading(false);
        if (data && data.result && data.user) {
          onRegistered(data.user);
        } else {
          setError(data?.reason || "Could not register your fusion onQ account.");
        }
      })
      .catch((e) => {
        setError(e?.response?.data?.error || e?.message || "Could not register your fusion onQ account.");
        setLoading(false);
      });
  }

  const inputClass = "w-full bg-card border border-border rounded-lg px-3 py-3 text-sm text-foreground focus:outline-none focus:border-primary";

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <UserPlus className="w-8 h-8 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Create your fusion onQ account</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{mobile}</span> isn't on fusion onQ yet. Fill in your details below to create your account — you'll be signed straight in.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider block">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Joe"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider block">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Soap"
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider block">Password</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            className={inputClass + " pr-11"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground uppercase tracking-wider block">Re-enter Password</label>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className={inputClass + " pr-11"}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p className="text-xs text-destructive">Passwords don't match.</p>
        )}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-primary"
        />
        <span className="text-sm text-foreground">I agree to the fusion onQ Terms &amp; Conditions</span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button className="w-full h-11" disabled={!canSubmit} onClick={handleRegister}>
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Create Account"}
      </Button>
    </div>
  );
}