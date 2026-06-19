import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, AlertTriangle, Loader2 } from "lucide-react";

export default function FusionUserDialog({ open, onClose, status, userData, error }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Fusion User Info
          </DialogTitle>
        </DialogHeader>

        {status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching user from Fusion...
          </div>
        )}

        {status === "error" && (
          <div className="flex items-start gap-2 text-sm text-emergency py-4">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error || "Could not retrieve user info."}</span>
          </div>
        )}

        {status === "success" && (
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-96 whitespace-pre-wrap break-words">
            {JSON.stringify(userData, null, 2)}
          </pre>
        )}
      </DialogContent>
    </Dialog>
  );
}