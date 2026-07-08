"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DOMAINS, getTopic } from "@/lib/topics";
import { cn } from "@/lib/utils";

type OnboardingFlowProps = {
  onComplete: (topicSlugs: string[]) => void;
  onSkip?: () => void;
};

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const topicOptions = useMemo(() => {
    const slugs = selectedDomains.flatMap(
      (domainSlug) => DOMAINS.find((domain) => domain.slug === domainSlug)?.topicSlugs ?? [],
    );
    return [...new Set(slugs)];
  }, [selectedDomains]);

  function toggleDomain(slug: string) {
    setSelectedDomains((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  function toggleTopic(slug: string) {
    setSelectedTopics((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  function goToTopics() {
    setSelectedTopics([]);
    setStep(2);
  }

  function finish() {
    if (selectedTopics.length === 0) return;
    onComplete(selectedTopics);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
        {onSkip ? (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
          </div>
        ) : null}

        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/paperama-logo.jpg"
            alt="Paperama"
            width={64}
            height={64}
            className="mb-4 size-16 rounded-2xl object-cover"
            priority
          />
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Step {step} of 2
          </p>
        </div>

        {step === 1 ? (
          <>
            <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
              What research areas interest you?
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Pick one or more — we&apos;ll narrow topics next.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {DOMAINS.map((domain) => {
                const selected = selectedDomains.includes(domain.slug);
                return (
                  <button
                    key={domain.slug}
                    type="button"
                    onClick={() => toggleDomain(domain.slug)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      selected
                        ? "border-rg-accent bg-rg-accent/10 text-rg-accent"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                    )}
                  >
                    {domain.label}
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              className={cn(
                "mt-8 w-full",
                "border border-rg-accent/30 bg-rg-accent/10 text-rg-accent hover:bg-rg-accent/15",
              )}
              disabled={selectedDomains.length === 0}
              onClick={goToTopics}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
              Which topics should we show you?
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Pick at least one to personalize your feed.
            </p>

            <div className="mt-6 flex max-h-[40vh] flex-wrap justify-center gap-2 overflow-y-auto">
              {topicOptions.map((slug) => {
                const topic = getTopic(slug);
                if (!topic) return null;
                const selected = selectedTopics.includes(slug);

                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleTopic(slug)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      selected
                        ? "border-rg-accent bg-rg-accent/10 text-rg-accent"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                    )}
                  >
                    {topic.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                className={cn(
                  "flex-1",
                  "border border-rg-accent/30 bg-rg-accent/10 text-rg-accent hover:bg-rg-accent/15",
                )}
                disabled={selectedTopics.length === 0}
                onClick={finish}
              >
                Start reading
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
