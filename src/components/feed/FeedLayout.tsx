"use client";

import { useCallback, useEffect, useState } from "react";

import { FeedAddTopicDialog } from "@/components/feed/FeedAddTopicDialog";
import { FeedMobileHeader } from "@/components/feed/FeedMobileHeader";
import { FeedNavSidebar } from "@/components/feed/FeedNavSidebar";
import { FeedScrollNav } from "@/components/feed/FeedScrollNav";
import { FeedSearchDialog } from "@/components/feed/FeedSearchDialog";
import { FeedToast } from "@/components/feed/FeedToast";
import { PaperFeed } from "@/components/feed/PaperFeed";
import { FeedProvider } from "@/contexts/feed-context";

function FeedLayoutInner() {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const [scrollApi, setScrollApi] = useState<{
    scrollToPrev: () => void;
    scrollToNext: () => void;
  } | null>(null);

  const handleScrollStateChange = useCallback(
    (state: { canScrollPrev: boolean; canScrollNext: boolean }) => {
      setCanScrollPrev(state.canScrollPrev);
      setCanScrollNext(state.canScrollNext);
    },
    [],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (["Home", "End", "PageUp", "PageDown"].includes(event.key)) {
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  return (
    <>
      <div className="flex h-dvh overflow-hidden">
        <FeedNavSidebar />

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/40">
          <FeedMobileHeader />

          <PaperFeed
            className="min-h-0 flex-1"
            slideClassName="lg:h-dvh h-[calc(100dvh-var(--feed-header-height))]"
            onScrollStateChange={handleScrollStateChange}
            onScrollApiReady={setScrollApi}
          />

          <div className="pointer-events-none absolute inset-y-0 right-3 z-20 hidden items-center lg:flex xl:right-5">
            <div className="pointer-events-auto">
              <FeedScrollNav
                onScrollPrev={() => scrollApi?.scrollToPrev()}
                onScrollNext={() => scrollApi?.scrollToNext()}
                canScrollPrev={canScrollPrev}
                canScrollNext={canScrollNext}
              />
            </div>
          </div>
        </div>
      </div>

      <FeedSearchDialog />
      <FeedAddTopicDialog />
      <FeedToast />
    </>
  );
}

export function FeedLayout() {
  return (
    <FeedProvider>
      <FeedLayoutInner />
    </FeedProvider>
  );
}
