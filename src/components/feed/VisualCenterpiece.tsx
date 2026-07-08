"use client";

import { useEffect, useState } from "react";

import { TopicFigurePlaceholder } from "@/components/feed/TopicFigurePlaceholder";
import { figureProxyUrl } from "@/lib/figures/proxy";
import { cn } from "@/lib/utils";

type VisualCenterpieceProps = {
  src?: string;
  alt?: string;
  topicSlug?: string;
  className?: string;
  onUnavailable?: () => void;
};

export function VisualCenterpiece({
  src,
  topicSlug,
  alt = "",
  className,
  onUnavailable,
}: VisualCenterpieceProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/30",
        className,
      )}
    >
      {showImage ? (
        <img
          src={figureProxyUrl(src!)}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(true);
            // Intentionally do not remove the card — placeholders keep the feed scrollable.
          }}
        />
      ) : (
        <TopicFigurePlaceholder topicSlug={topicSlug} className="absolute inset-0" />
      )}
    </div>
  );
}
