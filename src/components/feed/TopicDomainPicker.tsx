"use client";

import { useState } from "react";

import { useFeed } from "@/contexts/feed-context";
import { DOMAINS, getTopic } from "@/lib/topics";
import { cn } from "@/lib/utils";

type TopicDomainPickerProps = {
  className?: string;
  compact?: boolean;
};

export function TopicDomainPicker({ className, compact = false }: TopicDomainPickerProps) {
  const { isTopicSelected, toggleTopicSlug, selectedTopicSlugs } = useFeed();

  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  function openDomain(domainSlug: string) {
    setExpandedDomain((current) => (current === domainSlug ? null : domainSlug));
  }

  return (
    <div className={cn("space-y-4", className)}>
      {!compact ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">Your topics</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick substates to shape For You. Cards show{" "}
            <span className="font-medium text-rg-accent">Matches:</span> for the topic they fit.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {selectedTopicSlugs.length} selected
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {DOMAINS.map((domain) => {
          const expanded = expandedDomain === domain.slug;

          return (
            <section key={domain.slug} className="space-y-2">
              <button
                type="button"
                onClick={() => openDomain(domain.slug)}
                aria-expanded={expanded}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted",
                  expanded && "bg-muted/60",
                )}
              >
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {domain.label}
                </span>
              </button>

              {expanded ? (
                <ul className="flex flex-wrap gap-1.5 pl-1">
                  {domain.topicSlugs.map((slug) => {
                    const topic = getTopic(slug);
                    if (!topic) return null;
                    const selected = isTopicSelected(slug);

                    return (
                      <li key={slug}>
                        <button
                          type="button"
                          onClick={() => toggleTopicSlug(slug)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            selected
                              ? "border-rg-accent bg-rg-accent/10 text-rg-accent"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                          )}
                          aria-pressed={selected}
                        >
                          {topic.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
