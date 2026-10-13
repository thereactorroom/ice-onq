import { useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.5;

const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
const touchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/**
 * Fullscreen profile-photo viewer.
 * Zoom with a pinch (mobile) or the +/− buttons (any device); drag to move
 * around the zoomed photo; reset returns to 1x.
 */
export default function ZoomablePhotoOverlay({ src, alt = "Profile photo", onClose }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [smooth, setSmooth] = useState(false);
  const frameRef = useRef(null);
  const gesture = useRef(null);

  const reset = () => { setSmooth(true); setScale(1); setOffset({ x: 0, y: 0 }); };

  // Keep the zoomed photo inside its frame.
  // offsetWidth/Height are the untransformed layout size, so they stay stable.
  const clampOffset = (x, y, s) => {
    const el = frameRef.current;
    if (!el) return { x, y };
    const maxX = ((s - 1) * el.offsetWidth) / 2;
    const maxY = ((s - 1) * el.offsetHeight) / 2;
    return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
  };

  const zoomTo = (next) => {
    const s = clampScale(next);
    setSmooth(true);
    setScale(s);
    setOffset((o) => clampOffset(o.x, o.y, s));
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Mouse drag to move a zoomed photo (touch uses the handlers below).
  const startMouseDrag = (e) => {
    if (scale <= 1) return;
    setSmooth(false);
    gesture.current = { mode: "mouse", startX: e.clientX, startY: e.clientY, startOffset: offset };
  };

  useEffect(() => {
    if (scale <= 1) return;
    const onMove = (e) => {
      const g = gesture.current;
      if (!g || g.mode !== "mouse") return;
      setOffset(clampOffset(g.startOffset.x + (e.clientX - g.startX), g.startOffset.y + (e.clientY - g.startY), scale));
    };
    const onUp = () => { if (gesture.current?.mode === "mouse") gesture.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scale]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      gesture.current = { mode: "pinch", startDist: touchDistance(e.touches[0], e.touches[1]), startScale: scale };
    } else if (e.touches.length === 1) {
      gesture.current = { mode: "drag", startX: e.touches[0].clientX, startY: e.touches[0].clientY, startOffset: offset };
    }
  };

  const handleTouchMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (g.mode === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      setSmooth(false);
      const ratio = touchDistance(e.touches[0], e.touches[1]) / g.startDist;
      setScale(clampScale(g.startScale * ratio));
    } else if (g.mode === "drag" && e.touches.length === 1 && scale > 1) {
      e.preventDefault();
      setOffset(clampOffset(
        g.startOffset.x + (e.touches[0].clientX - g.startX),
        g.startOffset.y + (e.touches[0].clientY - g.startY),
        scale,
      ));
    }
  };

  const handleTouchEnd = (e) => {
    // A pinch that ends leaves the photo where it is; clamp it back in frame.
    if (e.touches.length === 0) {
      setOffset((o) => clampOffset(o.x, o.y, scale));
      gesture.current = null;
    }
  };

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        title="Close"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        ref={frameRef}
        onClick={stop}
        onMouseDown={startMouseDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-[85vw] max-w-sm aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-black touch-none cursor-grab active:cursor-grabbing"
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
          className={`w-full h-full object-cover select-none ${smooth ? "transition-transform duration-200 ease-out" : ""}`}
        />
      </div>

      <div className="flex items-center gap-2" onClick={stop}>
        <button
          onClick={() => zoomTo(scale - STEP)}
          disabled={scale <= MIN_SCALE}
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <span className="min-w-[54px] text-center text-sm font-semibold text-white tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => zoomTo(scale + STEP)}
          disabled={scale >= MAX_SCALE}
          className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white flex items-center justify-center transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={reset}
          disabled={scale === 1 && offset.x === 0 && offset.y === 0}
          className="ml-1 h-11 px-4 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white flex items-center gap-2 text-sm font-semibold transition-colors"
          title="Reset zoom"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      <p className="text-[11px] text-white/70 -mt-2">Pinch to zoom, or use the buttons</p>
    </div>
  );
}