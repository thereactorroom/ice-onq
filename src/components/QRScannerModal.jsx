import { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { X, Camera, Loader2, AlertCircle } from "lucide-react";

export default function QRScannerModal({ open, onClose, onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    if (!open) return;

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
            ? "Camera access denied. Please allow camera permissions and try again."
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
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
          {starting && !error && (
            <div className="flex flex-col items-center gap-2 text-white/70">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs">Starting camera…</p>
            </div>
          )}
          {error ? (
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
              {/* Scan frame overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-2/3 h-2/3 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            Point the camera at the QR code. It will be detected automatically.
          </p>
        </div>
      </div>
    </div>
  );
}