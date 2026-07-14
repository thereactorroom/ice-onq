// Animated loading skeleton that mimics the main page layout.
// Provides instant visual feedback while data loads in the background.
import { FUSION_CONFIG } from "@/lib/fusionConfig";

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-primary sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-white/30" />
          <span className="font-bold text-sm tracking-wider text-white">{FUSION_CONFIG.APP_NAME}</span>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="max-w-lg mx-auto px-4 pt-4 pb-36 space-y-4 animate-pulse">
        {/* Profile/header card skeleton */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-muted rounded w-2/3" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </div>

        {/* Banner skeleton */}
        <div className="h-16 bg-muted rounded-2xl" />

        {/* List skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded w-40" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-24 bg-card rounded-2xl border border-border" />
            <div className="h-24 bg-card rounded-2xl border border-border" />
          </div>
        </div>

        {/* Section skeleton */}
        <div className="space-y-3">
          <div className="h-5 bg-muted rounded w-32" />
          <div className="h-32 bg-card rounded-2xl border border-border" />
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around py-2 max-w-lg mx-auto">
          <div className="w-12 h-12 flex flex-col items-center justify-center gap-1">
            <div className="w-5 h-5 bg-muted rounded" />
            <div className="h-2 w-8 bg-muted rounded" />
          </div>
          <div className="w-12 h-12 flex flex-col items-center justify-center gap-1">
            <div className="w-5 h-5 bg-muted rounded" />
            <div className="h-2 w-8 bg-muted rounded" />
          </div>
        </div>
      </nav>
    </div>
  );
}