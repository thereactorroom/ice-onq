import { useRef, useState, useEffect } from "react";

/**
 * DateInput — three-field dd / mm / yyyy picker.
 * value: "YYYY-MM-DD" string (or "")
 * onChange: (newValue: "YYYY-MM-DD" | "") => void
 */
export default function DateInput({ value, onChange, className = "" }) {
  function parse(v) {
    if (!v) return { dd: "", mm: "", yyyy: "" };
    const [y, m, d] = v.split("-");
    return { dd: d || "", mm: m || "", yyyy: y || "" };
  }

  const [parts, setParts] = useState(() => parse(value));
  const mmRef = useRef(null);
  const yyyyRef = useRef(null);

  // Sync if parent value changes externally
  useEffect(() => {
    setParts(parse(value));
  }, [value]);

  function emit(next) {
    const { dd, mm, yyyy } = next;
    if (dd.length === 2 && mm.length === 2 && yyyy.length === 4) {
      onChange(`${yyyy}-${mm}-${dd}`);
    } else if (!dd && !mm && !yyyy) {
      onChange("");
    }
    // partial — don't emit yet
  }

  function handleDd(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    const next = { ...parts, dd: raw };
    setParts(next);
    emit(next);
    if (raw.length === 2) mmRef.current?.focus();
  }

  function handleMm(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    const next = { ...parts, mm: raw };
    setParts(next);
    emit(next);
    if (raw.length === 2) yyyyRef.current?.focus();
  }

  function handleYyyy(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    const next = { ...parts, yyyy: raw };
    setParts(next);
    emit(next);
  }

  // Backspace on empty mm → focus dd
  function handleMmKey(e) {
    if (e.key === "Backspace" && parts.mm === "") {
      document.querySelector(`[data-dateinput-dd]`)?.focus();
    }
  }
  // Backspace on empty yyyy → focus mm
  function handleYyyyKey(e) {
    if (e.key === "Backspace" && parts.yyyy === "") {
      mmRef.current?.focus();
    }
  }

  const base = `bg-transparent text-center focus:outline-none text-sm text-foreground`;
  const sep = `text-muted-foreground text-sm select-none`;
  const wrap = `flex items-center w-full bg-background border border-border rounded-lg px-3 py-2.5 gap-0.5 ${className}`;

  return (
    <div className={wrap}>
      <input
        data-dateinput-dd
        type="text"
        inputMode="numeric"
        placeholder="dd"
        value={parts.dd}
        onChange={handleDd}
        className={`${base} w-7`}
        maxLength={2}
      />
      <span className={sep}>/</span>
      <input
        ref={mmRef}
        type="text"
        inputMode="numeric"
        placeholder="mm"
        value={parts.mm}
        onChange={handleMm}
        onKeyDown={handleMmKey}
        className={`${base} w-7`}
        maxLength={2}
      />
      <span className={sep}>/</span>
      <input
        ref={yyyyRef}
        type="text"
        inputMode="numeric"
        placeholder="yyyy"
        value={parts.yyyy}
        onChange={handleYyyy}
        onKeyDown={handleYyyyKey}
        className={`${base} w-12`}
        maxLength={4}
      />
    </div>
  );
}