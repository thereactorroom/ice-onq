import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { X, Camera, Loader2, AlertCircle, ScanLine } from "lucide-react";
import { getGlobalBridge } from "@/lib/fusionBridge";

export default function QRScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const [usingBridge, setUsingBridge] = useState(false);

  // Mobile native app = NativeBridge global is present (injected by the fusion app).
  // Browser (desktop or mobile browser) = no NativeBridge → use the web camera.
  const nativeBridge = getGlobalBridge("NativeBridge");
  const useBridgeScan = !!nativeBridge;

  useEffect(() => {
    if (!open) return;
    setError(null);

    // ── Mobile native app: delegate to the bridge scanner ──
    if (useBridgeScan) {
      setUsingBridge(true);
      setStarting(false);

      let settled = false;

      const finish = (text) => {
        if (settled) return;
        settled = true;
        if (text) onScan(String(text));
      };

      const fail = (msg) => {
        if (settled) return;
        settled = true;
        setUsingBridge(false);
        setError(msg);
      };

      // Listen for the parent app's scan result via postMessage
      const handler = (event) => {
        const data = event.data || {};
        if (data.request === "scanQR" || data.type === "scanQR" || data.event === "scanQR") {
          const value =
            data.payload?.token || data.payload?.data || data.payload?.qr ||
            data.token || data.data || data.qr;
          if (value) finish(value);
        }
      };
      window.addEventListener("message", handler);

      // Try synchronous native methods first
      const tryNative = (method) => {
        if (nativeBridge && typeof nativeBridge[method] === "function") {
          try {
            const result = nativeBridge[method]();
            if (typeof result === "string") return Promise.resolve(result);
            if (result && typeof result.then === "function") return result;
          } catch {}
        }
        return null;
      };

      const nativeResult =
        tryNative("scanQR") || tryNative("scanQrCode") || tryNative("scanQRCode");
      if (nativeResult) {
        nativeResult.then(finish, () => fail("Native scan was cancelled. Please paste the QR token manually."));
      } else {
        // Ask the parent app to scan and reply
        const fusionBridge = getGlobalBridge("FusionBridge");
        const payload = { request: "scanQR", payload: {} };
        let sent = false;
        if (fusionBridge && typeof fusionBridge.send === "function") {
          try { fusionBridge.send(payload); sent = true; } catch {}
        }
        if (!sent && window.self !== window.top) {
          try { window.parent.postMessage(payload, "*"); sent = true; } catch {}
        }
        if (!sent) {
          fail("Native scanning isn't available. Please paste the QR token manually.");
        } else {
          setTimeout(() => fail("Scanning timed out. Please paste the QR token manually."), 60000);
        }
      }

      return () => {
        settled = true;
        window.removeEventListener("message", handler);
      };
    }

    // ── Browser: use the device camera ──
    setUsingBridge(false);
    let stopped = false;

    async function startCamera() {
      setError(null);
      setStarting(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          await video.play();
        }
        setStarting(false);
        tick();
      } catch (err) {
        setStarting(false);
        setError(
          err?.name === "NotAllowedError"
            ? "Camera access denied. Allow camera permissions in your browser settings, or paste the token manually."
            : "Could not access the camera. You can paste the token manually."
        );
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          stopCamera();
          onScan(code.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    function stopCamera() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    startCamera();

    return () => {
      stopped = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // Combined close handler — works for both mouse clicks and touch taps
  const handleClose = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl relative"
        style={{ pointerEvents: "auto" }}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border relative z-10">
          <div className="flex items-center gap-2">
            {usingBridge ? <ScanLine className="w-5 h-5 text-primary" /> : <Camera className="w-5 h-5 text-primary" />}
            <h3 className="font-bold text-foreground text-sm">Scan QR Code</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            onTouchEnd={handleClose}
            className="p-2 -mr-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
            style={{ minHeight: "40px", minWidth: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / status area */}
        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
          {usingBridge ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-white/80">Waiting for the native scanner…</p>
              <p className="text-xs text-white/50">The app will open its camera. Scan a QR code to continue.</p>
            </div>
          ) : starting && !error ? (
            <div className="flex flex-col items-center gap-2 text-white/70">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs">Starting camera…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-sm text-white/80">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-2/3 h-2/3 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer with Cancel button */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground text-center">
            {usingBridge
              ? "The native scanner will detect the QR code automatically."
              : "Point the camera at the QR code. It will be detected automatically."}
          </p>
          <button
            type="button"
            onClick={handleClose}
            onTouchEnd={handleClose}
            className="w-full py-2.5 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors touch-manipulation"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}