import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import jsQR from "jsqr";
import { X, Camera, Loader2, AlertCircle, ScanLine } from "lucide-react";
import { getGlobalBridge, isInFusionIframe } from "@/lib/fusionBridge";

// Request a native QR scan from the fusion parent app via the bridge.
// Resolves with the scanned string, or rejects if no bridge scan is available.
function requestBridgeScan() {
  return new Promise((resolve, reject) => {
    const nativeBridge = getGlobalBridge("NativeBridge");
    const fusionBridge = getGlobalBridge("FusionBridge");

    // Try common native bridge method names
    const tryNative = (method) => {
      if (nativeBridge && typeof nativeBridge[method] === "function") {
        try {
          const result = nativeBridge[method]();
          if (typeof result === "string") return result;
          if (result && typeof result.then === "function") return result;
        } catch (e) { /* fall through */ }
      }
      return null;
    };

    const nativeResult =
      tryNative("scanQR") ||
      tryNative("scanQrCode") ||
      tryNative("scanQRCode") ||
      tryNative("scanBarcode");
    if (nativeResult) {
      Promise.resolve(nativeResult).then(resolve, reject);
      return;
    }

    // Ask the parent app to scan and reply via postMessage
    let settled = false;
    const handler = (event) => {
      if (settled) return;
      const data = event.data || {};
      if (data.request === "scanQR" || data.type === "scanQR" || data.event === "scanQR") {
        const value = data.payload?.token || data.payload?.data || data.payload?.qr || data.token || data.data || data.qr;
        if (value) {
          settled = true;
          window.removeEventListener("message", handler);
          resolve(String(value));
        }
      }
    };
    window.addEventListener("message", handler);

    const payload = { request: "scanQR", payload: {} };
    let sent = false;
    if (fusionBridge && typeof fusionBridge.send === "function") {
      try { fusionBridge.send(payload); sent = true; } catch {}
    }
    if (!sent && window.self !== window.top) {
      try { window.parent.postMessage(payload, "*"); sent = true; } catch {}
    }

    if (!sent) {
      window.removeEventListener("message", handler);
      reject(new Error("no_bridge"));
      return;
    }

    // Timeout — no scan response from parent
    setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handler);
      reject(new Error("timeout"));
    }, 60000);
  });
}

export default function QRScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const [usingBridge, setUsingBridge] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);

    const inFusion = isInFusionIframe();

    // Inside the fusion iframe the browser blocks camera access (cross-origin
    // iframe without allow="camera"), so delegate to the native/parent bridge.
    if (inFusion) {
      setUsingBridge(true);
      setStarting(false);
      requestBridgeScan()
        .then((text) => { onScan(text); })
        .catch((err) => {
          setUsingBridge(false);
          if (err?.message === "no_bridge") {
            setError("Native scanning isn't available here. Please paste the QR token manually below.");
          } else {
            setError("Scanning timed out or was cancelled. Please paste the QR token manually below.");
          }
        });
      return;
    }

    // Web camera fallback (direct web visit, or iframe with camera permission)
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
            ? "Camera access denied. Please allow camera permissions and try again, or paste the token manually."
            : "Could not access the camera. You can still paste the token manually."
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

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {usingBridge ? <ScanLine className="w-5 h-5 text-primary" /> : <Camera className="w-5 h-5 text-primary" />}
            <h3 className="font-bold text-foreground text-sm">Scan QR Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-square bg-black flex items-center justify-center">
          {usingBridge ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ScanLine className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-white/80">Waiting for the native scanner…</p>
              <p className="text-xs text-white/50">The fusion app will open its camera. Scan a QR code to continue.</p>
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

        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            {usingBridge
              ? "The native scanner will detect the QR code automatically."
              : "Point the camera at the QR code. It will be detected automatically."}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}