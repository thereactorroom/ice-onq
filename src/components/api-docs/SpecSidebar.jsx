import { useEffect, useState } from "react";

export default function SpecSidebar({ sections }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <>
      {/* Desktop rail */}
      <nav className="hidden lg:block">
        <div className="sticky top-6 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Contents
          </p>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`block text-xs py-1.5 pl-3 border-l-2 transition-colors ${
                active === s.id
                  ? "border-primary text-primary font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile chips */}
      <nav className="lg:hidden -mx-4 px-4 pb-1 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full border transition-colors ${
                active === s.id
                  ? "border-primary/30 bg-primary/10 text-primary font-semibold"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}