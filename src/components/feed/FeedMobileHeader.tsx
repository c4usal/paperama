"use client";

import Image from "next/image";
import { Search } from "lucide-react";

import { useFeed } from "@/contexts/feed-context";
import type { FeedNavTab } from "@/types/feed";
import { cn } from "@/lib/utils";

const MOBILE_TABS: { id: FeedNavTab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "saved", label: "Saved" },
  { id: "topics", label: "Topics" },
];

export function FeedMobileHeader() {
  const { activeTab, setActiveTab, openSearch } = useFeed();

  return (
    <header className="h-[var(--feed-header-height)] shrink-0 border-b border-border bg-card lg:hidden">
      <div className="mx-auto flex h-full max-w-md items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <div className="shrink-0 rounded-xl bg-white p-1 ring-1 ring-border">
            <Image
              src="/paperama-logo.jpg"
              alt="Paperama"
              width={28}
              height={28}
              className="size-7 rounded-lg object-cover"
              priority
            />
          </div>
          <span className="shrink-0 text-sm font-semibold tracking-tight text-foreground">
            Paperama
          </span>

          <nav className="flex h-full min-w-0 flex-1 items-center gap-4 overflow-x-auto">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex h-full shrink-0 items-center border-b-2 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "border-rg-accent text-rg-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={openSearch}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Search"
        >
          <Search className="size-4" />
        </button>
      </div>
    </header>
  );
}
