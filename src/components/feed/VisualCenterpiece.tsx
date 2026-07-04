"use client";

import Image from "next/image";
import { useState } from "react";

import { TopicFigurePlaceholder } from "@/components/feed/TopicFigurePlaceholder";
import { cn } from "@/lib/utils";

type VisualCenterpieceProps = {
  src?: string;
  topicSlug?: string;
  alt?: string;
  className?: string;
};

export function VisualCenterpiece({
  src,
  topicSlug,
  alt = "",
  className,
}: VisualCenterpieceProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted/30",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={alt}
          fill
          className="object-cover"
          sizes="400px"
          priority
          onError={() => setFailed(true)}
        />
      ) : (
        <TopicFigurePlaceholder topicSlug={topicSlug} className="absolute inset-0" />
      )}
    </div>
  );
}
