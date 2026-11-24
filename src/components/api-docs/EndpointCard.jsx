import { Lock, Info, AlertTriangle } from "lucide-react";
import CodeBlock from "./CodeBlock";

function StatusPill({ status }) {
  const tone =
    status >= 500
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : status >= 400
        ? "bg-warning/10 text-foreground border-warning/40"
        : "bg-success/10 text-success border-success/30";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tone}`}>{status}</span>
  );
}

export default function EndpointCard({ endpoint }) {
  return (
    <section id={endpoint.id} className="scroll-mt-24">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {endpoint.method}
            </span>
            <h3 className="font-bold text-base text-foreground">{endpoint.name}</h3>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-1 break-all">{endpoint.path}</p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{endpoint.summary}</p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Auth */}
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Auth: </span>
              {endpoint.auth}
            </p>
          </div>

          {/* Action table */}
          {endpoint.actions && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="py-1.5 pr-3 font-semibold">Action</th>
                    <th className="py-1.5 pr-3 font-semibold">Access</th>
                    <th className="py-1.5 font-semibold">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.actions.map((a) => (
                    <tr key={a.action} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-foreground">{a.action}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{a.auth}</td>
                      <td className="py-1.5 text-muted-foreground">{a.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Requests */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Request body
            </h4>
            {endpoint.requests.map((r) => (
              <div key={r.label} className="space-y-1.5">
                <p className="text-xs text-foreground font-medium">{r.label}</p>
                <CodeBlock code={r.code} label={typeof r.code === "string" ? "http" : "json"} />
              </div>
            ))}
          </div>

          {/* Responses */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Responses
            </h4>
            {endpoint.responses.map((r) => (
              <div key={r.label} className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {r.status && <StatusPill status={r.status} />}
                  <p className="text-xs text-foreground font-medium">{r.label}</p>
                  {r.illustrative && (
                    <span className="text-[10px] text-muted-foreground italic">illustrative shape</span>
                  )}
                </div>
                <CodeBlock code={r.code} label="json" />
              </div>
            ))}
          </div>

          {/* Errors */}
          {endpoint.errors?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Errors
              </h4>
              {endpoint.errors.map((e) => (
                <div key={`${e.status}-${JSON.stringify(e.code)}`} className="flex items-start gap-2">
                  <div className="pt-1">
                    <StatusPill status={e.status} />
                  </div>
                  <div className="flex-1">
                    <CodeBlock code={e.code} label="json" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {endpoint.notes?.length > 0 && (
            <div className="bg-muted/50 border border-border rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Business rules
                </span>
              </div>
              <ul className="space-y-1.5">
                {endpoint.notes.map((n) => (
                  <li key={n} className="flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 text-muted-foreground/60 mt-1 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground leading-relaxed">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}