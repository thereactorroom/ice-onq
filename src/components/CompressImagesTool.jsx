import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Check, Loader2, AlertCircle } from "lucide-react";

function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function CompressImagesTool({ onComplete }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    base44.entities.ICEProfile.list().then((p) => {
      setProfiles(p.filter((x) => x.profile_photo));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleCompressAll() {
    setProcessing(true);
    const items = [];
    const withPhoto = profiles.filter((p) => p.profile_photo);

    for (const profile of withPhoto) {
      try {
        const res = await fetch(profile.profile_photo);
        if (!res.ok) {
          items.push({ id: profile.id, status: "skipped", reason: "Download failed" });
          continue;
        }
        const blob = await res.blob();
        const tempImg = new Image();
        await new Promise((resolve, reject) => {
          tempImg.onload = resolve;
          tempImg.onerror = reject;
          tempImg.src = URL.createObjectURL(blob);
        });

        if (tempImg.width <= 400 && tempImg.height <= 400) {
          items.push({ id: profile.id, status: "skipped", reason: "Already small enough" });
          continue;
        }

        const file = new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
        const compressed = await compressImage(file);
        const result = await base44.integrations.Core.UploadFile({ file: compressed });
        await base44.functions.invoke("updatePublicICEProfile", {
          profileId: profile.id,
          updates: { profile_photo: result.file_url },
        });
        items.push({ id: profile.id, status: "compressed", display_name: profile.display_name });
      } catch (err) {
        items.push({ id: profile.id, status: "failed", error: err.message });
      }
      setResults([...items]);
    }
    setProcessing(false);
  }

  const compressed = results.filter((r) => r.status === "compressed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed").length;

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading profiles...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Compress Profile Images</h3>
          <p className="text-xs text-muted-foreground">
            {profiles.length} profile{profiles.length !== 1 ? "s" : ""} with photos
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Resizes all profile images to max 400×400 and compresses them as JPEG at 70% quality. 
        Already-small images are skipped.
      </p>

      {results.length > 0 && (
        <div className="flex gap-3 text-sm">
          {compressed > 0 && (
            <span className="flex items-center gap-1 text-success">
              <Check className="w-4 h-4" /> {compressed} compressed
            </span>
          )}
          {skipped > 0 && <span className="text-muted-foreground">{skipped} skipped</span>}
          {failed > 0 && (
            <span className="flex items-center gap-1 text-emergency">
              <AlertCircle className="w-4 h-4" /> {failed} failed
            </span>
          )}
        </div>
      )}

      <Button
        onClick={handleCompressAll}
        disabled={processing || profiles.length === 0}
        className="w-full gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Compressing...
          </>
        ) : (
          <>
            <ImageIcon className="w-4 h-4" /> Compress All Images
          </>
        )}
      </Button>
    </div>
  );
}