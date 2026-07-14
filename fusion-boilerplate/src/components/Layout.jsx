import { Outlet, Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useQueryString } from "@/hooks/useQueryString";
import { FUSION_CONFIG } from "@/lib/fusionConfig";

// ── Navigation Items ──────────────────────────────────────────────────────────
// Edit these to match your app's pages. The "Back" item navigates to "/".
// Each item: { path, label, icon }
// Import your own icons from lucide-react.
const navItems = [
  // Example:
  // { path: "/dashboard", label: "Home", icon: Home },
  // { path: "/settings", label: "Settings", icon: Settings },
];

// Mobile-first layout shell:
// - Sticky header with app branding + logout
// - Content area with max-width constraint
// - Fixed bottom navigation (mobile) / horizontal nav in header (desktop)
// - Preserves URL query parameters across navigation via useQueryString()
export default function Layout() {
  const location = useLocation();
  const queryString = useQueryString();

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={`/${queryString}`} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emergency flex items-center justify-center">
              <span className="text-white font-bold text-sm">{FUSION_CONFIG.APP_NAME.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">{FUSION_CONFIG.APP_NAME}</h1>
              <p className="text-[11px] opacity-70 leading-none">{FUSION_CONFIG.APP_TAGLINE}</p>
            </div>
          </Link>

          {/* Desktop nav (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={`${item.path}${queryString}`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    location.pathname === item.path
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* ── Bottom Navigation (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={`${item.path}${queryString}`}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {Icon && <Icon className="w-5 h-5" />}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}