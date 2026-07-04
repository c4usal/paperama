import type { ComponentProps } from "react";

import { TufteArticle } from "@/components/tufte-article";
import { cn } from "@/lib/utils";

type ProseProps = ComponentProps<"article">;

/** Long-form reading content — Tufte CSS typography */
export function Prose({ className, children, ...props }: ProseProps) {
  return (
    <TufteArticle className={cn("max-w-none", className)} {...props}>
      <section>{children}</section>
    </TufteArticle>
  );
}
