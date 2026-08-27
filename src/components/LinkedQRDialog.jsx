import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LinkedQRCodesSection from "./LinkedQRCodesSection";

// Wraps the existing Linked QR Codes manager in a dialog so it can be opened
// from the profile selector tiles without navigating to the Edit screen.
export default function LinkedQRDialog({ open, onOpenChange, profileDbId, profileName, fusionUserId }) {
  if (!profileDbId) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Linked QR Codes — {profileName}</DialogTitle>
        </DialogHeader>
        {/* key forces a fresh mount per profile so internal state resets */}
        <LinkedQRCodesSection profileDbId={profileDbId} fusionUserId={fusionUserId} key={profileDbId} />
      </DialogContent>
    </Dialog>
  );
}