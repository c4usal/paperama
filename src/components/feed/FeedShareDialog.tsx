"use client";

import { Copy, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedShareDialogProps = {
  open: boolean;
  onClose: () => void;
  onShareLink: () => void;
  onCopyZoteroBibtex: () => void;
};

export function FeedShareDialog({ open, onClose, onShareLink, onCopyZoteroBibtex }: FeedShareDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-start justify-center bg-black/40 p-4 pt-24"
      role="dialog"
      aria-modal="true"
      aria-label="Share paper"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Share</p>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close share dialog">
            <X className="size-4" />
          </Button>
        </div>

        <div className="space-y-2 p-3">
          <Button type="button" className={cn("w-full justify-start gap-2")} onClick={onShareLink}>
            <Share2 className="size-4" />
            Share link
          </Button>

          <Button type="button" variant="outline" className={cn("w-full justify-start gap-2")} onClick={onCopyZoteroBibtex}>
            <Copy className="size-4" />
            Copy BibTeX (Zotero)
          </Button>

          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            In Zotero Desktop: File → Import from Clipboard (Ctrl+Alt+Shift+I).
          </p>
        </div>
      </div>
    </div>
  );
}

