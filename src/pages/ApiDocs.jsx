import { useState, useEffect } from "react";
import { Shield, ArrowRight, Terminal, Server, AlertTriangle, BookOpen, Lock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SpecSidebar from "@/components/api-docs/SpecSidebar";
import EndpointCard from "@/components/api-docs/EndpointCard";
import CodeBlock from "@/components/api-docs/CodeBlock";
import ApiDocsLogin from "@/components/api-docs/ApiDocsLogin";

const TOKEN_KEY = "iceonq_api_docs_token";

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export default function ApiDocs() {
  const [token, setToken] = useState(readToken);
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) {
      setSpec(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    base44.functions
      .invoke("apiDocsAuth", { action: "spec", token })
      .then((res) => {
        if (cancelled) return;
        if (!res.data?.spec) throw new Error(res.data?.error || "Could not load the specification.");
        setSpec(res.data.spec);
        setNotice("");
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        try {
          sessionStorage.removeItem(TOKEN_KEY);
        } catch {
          /* storage unavailable */
        }
        setToken("");
        setSpec(null);
        setLoading(false);
        setNotice("Your session expired. Sign in again.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleAuthed(nextToken) {
    try {
      sessionStorage.setItem(TOKEN_KEY, nextToken);
    } catch {
      /* storage unavailable — the in-memory token still works for this visit */
    }
    setToken(nextToken);
  }

  function handleLock() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
    setToken("");
    setSpec(null);
    setNotice("");
  }

  if (!token) {
    return <ApiDocsLogin onAuthed={handleAuthed} notice={notice} />;
  }

  if (loading || !spec) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="bg-primary">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm">Opening documentation…</p>
        </div>
      </div>
    );
  }

  const { specMeta, flow, conventions, httpExample, upstream, endpoints, limitations } = spec;

  const sections = [
    { id: "overview", label: "Flow overview" },
    { id: "conventions", label: "Conventions" },
    { id: "upstream", label: "fusion onQ API" },
    ...endpoints.map((e) => ({ id: e.id, label: e.name })),
    { id: "limitations", label: "Known limitations" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Brand bar */}
      <div className="bg-primary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-white" />
            <span className="font-bold text-sm tracking-wider text-white">ICE onQ</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-white/70">
              API reference · v{specMeta.version}
            </span>
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 text-[11px] text-white/80 hover:text-white px-2.5 py-1 rounded-full border border-white/25 transition-colors"
            >
              <Lock className="w-3 h-3" />
              Lock
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <header className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-4">
            <BookOpen className="w-3 h-3" />
            Developer documentation
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {specMeta.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">{specMeta.scope}</p>
          <div className="flex flex-wrap items-center gap-2 mt-5 text-[11px]">
            <span className="px-2 py-1 rounded-md bg-card border border-border font-mono text-muted-foreground">
              {specMeta.publishedUrl}/functions/&lt;name&gt;
            </span>
            <span className="px-2 py-1 rounded-md bg-card border border-border text-muted-foreground">
              Updated {specMeta.updated}
            </span>
          </div>
        </header>

        <div className="grid lg:grid-cols-[190px_1fr] gap-8 lg:gap-12 mt-10">
          <SpecSidebar sections={sections} />

          <main className="min-w-0 space-y-10">
            {/* Flow */}
            <section id="overview" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground mb-1">Flow overview</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                The claim flow runs when the app is opened outside the fusiononq.com iframe, usually from a
                scanned QR code that is not yet bound to a profile.
              </p>

              <ol className="space-y-3">
                {flow.map((s, i) => (
                  <li key={s.step} className="relative bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {s.step}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {s.endpoints.map((name) => (
                            <a
                              key={name}
                              href={`#${name}`}
                              className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              {name}
                              <ArrowRight className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                    {i < flow.length - 1 && (
                      <div className="absolute left-[26px] -bottom-3 w-px h-3 bg-border" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {/* Conventions */}
            <section id="conventions" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground mb-1">Conventions</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Shared behaviour that applies to every function below.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {conventions.map((c) => (
                  <div key={c.title} className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">{c.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Calling a function
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <CodeBlock code={httpExample.curl} label="http" />
                  <CodeBlock code={httpExample.sdk} label="javascript" />
                </div>
              </div>
            </section>

            {/* Upstream */}
            <section id="upstream" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground mb-1">fusion onQ API</h2>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                The five fusion proxies all forward to one upstream endpoint. Callers should use the proxies:
                they attach the server-side key and normalise the number.
              </p>

              <div className="bg-card border border-border rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Server className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-mono font-semibold text-foreground">{upstream.url}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{upstream.transport}</p>
              </div>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs bg-card border border-border rounded-xl overflow-hidden">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="py-2 px-3 font-semibold">Action</th>
                      <th className="py-2 px-3 font-semibold">Proxy</th>
                      <th className="py-2 px-3 font-semibold">Form fields</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upstream.actions.map((a) => (
                      <tr key={a.action} className="border-b border-border/60 last:border-0">
                        <td className="py-2 px-3 font-mono text-foreground">{a.action}</td>
                        <td className="py-2 px-3 font-mono text-muted-foreground">{a.sentBy}</td>
                        <td className="py-2 px-3 text-muted-foreground">{a.fields}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <CodeBlock code={upstream.example.request} label="http" />
                <CodeBlock code={upstream.example.response} label="json" />
              </div>
              <p className="text-[11px] text-muted-foreground italic mt-2">
                The upstream user object is illustrative; its fields are passed through unchanged.
              </p>
            </section>

            {/* Endpoints */}
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Endpoints</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {endpoints.length} Base44 functions, in the order the claim flow calls them.
                </p>
              </div>
              {endpoints.map((e) => (
                <EndpointCard key={e.id} endpoint={e} />
              ))}
            </div>

            {/* Limitations */}
            <section id="limitations" className="scroll-mt-24">
              <h2 className="text-lg font-bold text-foreground mb-1">Known limitations</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Behaviour worth knowing before integrating or debugging this flow.
              </p>
              <div className="bg-warning/5 border border-warning/30 rounded-2xl p-4 space-y-2.5">
                {limitations.map((l) => (
                  <div key={l} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-foreground/80 leading-relaxed">{l}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}