import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const text = typeof code === "string" ? code : JSON.stringify(code, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — leave the label unchanged */
    }
  }

  return (
    <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          {label || "json"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-3 py-3 overflow-x-auto">
        <code className="text-[12px] leading-relaxed font-mono text-slate-200 whitespace-pre">{text}</code>
      </pre>
    </div>
  );
}