"use client";

import {
  Bookmark,
  Compass,
  Hash,
  Plus,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import type { FeedNavTab } from "@/types/feed";
import { cn } from "@/lib/utils";

const PRIMARY_NAV: { id: FeedNavTab; label: string; icon: typeof Sparkles }[] = [
  { id: "for-you", label: "For You", icon: Sparkles },
  { id: "following", label: "Following", icon: UserRound },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "topics", label: "Topics", icon: Hash },
];

export function FeedNavSidebar() {
  const {
    activeTab,
    setActiveTab,
    following,
    followEntity,
    openSearch,
    openAddTopic,
    savedSeedIds,
  } = useFeed();

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-border bg-card lg:flex",
        "w-[var(--feed-nav-width)] items-center py-3",
        "xl:w-[var(--feed-nav-width-expanded)] xl:items-stretch xl:py-0",
      )}
    >
      {/* Icon rail: lg only (narrow desktop). xl+ uses expanded layout below. */}
      <div className="flex w-full flex-1 flex-col items-center xl:hidden">
        <span className="mb-3 text-sm font-bold text-foreground" title="Paperama">
          P
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mb-2 size-10 rounded-lg"
          onClick={openSearch}
          aria-label="Search"
          title="Search"
        >
          <Search className="size-5" />
        </Button>

        <nav className="flex w-full flex-col items-center gap-0.5 px-1.5">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex size-10 items-center justify-center rounded-lg transition-colors",
                activeTab === item.id
                  ? "bg-rg-accent/10 text-rg-accent"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <item.icon className="size-5" />
              <span className="sr-only">{item.label}</span>
              {item.id === "saved" && savedSeedIds.size > 0 ? (
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rg-accent" />
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Expanded sidebar: xl+ (full desktop — matches TikTok logged-in layout) */}
      <div className="hidden min-h-0 flex-1 flex-col xl:flex">
        <div className="space-y-4 p-4">
          <span className="text-lg font-semibold tracking-tight text-foreground">Paperama</span>

          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              readOnly
              onFocus={openSearch}
              onClick={openSearch}
              placeholder="Search papers, authors…"
              className="h-9 w-full cursor-pointer rounded-lg border border-border bg-muted/40 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <nav className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-rg-accent/10 text-rg-accent"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.label}</span>
                {item.id === "saved" && savedSeedIds.size > 0 ? (
                  <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                    {savedSeedIds.size}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-4 py-3">
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Following accounts
          </h2>

          <ul className="space-y-1">
            {following.researchers.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => followEntity({ type: "researcher", value: item.name })}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {item.name.charAt(0)}
                  </span>
                  <span className="min-w-0 truncate text-sm text-foreground">{item.name}</span>
                </button>
              </li>
            ))}
            {following.journals.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => followEntity({ type: "journal", value: item.name })}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {item.name.charAt(0)}
                  </span>
                  <span className="min-w-0 truncate text-sm text-foreground">{item.name}</span>
                </button>
              </li>
            ))}
            {following.topics.map((topic) => (
              <li key={topic}>
                <button
                  type="button"
                  onClick={() => followEntity({ type: "topic", value: topic })}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    #
                  </span>
                  <span className="min-w-0 truncate text-sm text-foreground">{topic}</span>
                </button>
              </li>
            ))}
          </ul>

          <Button variant="outline" size="sm" className="mt-4 w-full gap-1.5" onClick={openAddTopic}>
            <Plus className="size-3.5" />
            Add topic
          </Button>
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <Compass className="mt-0.5 size-4 shrink-0 text-rg-accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Tune your feed by saving papers — Paperama learns what you want next.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
