"use client";

import { Microscope } from "lucide-react";

import { getTopicPlaceholderStyle } from "@/lib/figures/placeholders";
import { cn } from "@/lib/utils";

type TopicFigurePlaceholderProps = {
  topicSlug?: string;
  className?: string;
};

export function TopicFigurePlaceholder({ topicSlug, className }: TopicFigurePlaceholderProps) {
  const style = getTopicPlaceholderStyle(topicSlug);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br px-4",
        style.gradient,
        className,
      )}
    >
      <Microscope className={cn("size-8 opacity-80", style.accent)} strokeWidth={1.5} />
      <p className={cn("text-center text-xs font-medium tracking-wide uppercase", style.accent)}>
        {style.label}
      </p>
    </div>
  );
}
