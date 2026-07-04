import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type TufteArticleProps = ComponentProps<"article">;

export function TufteArticle({ className, children, ...props }: TufteArticleProps) {
  return (
    <article className={cn("tufte-article", className)} {...props}>
      {children}
    </article>
  );
}
