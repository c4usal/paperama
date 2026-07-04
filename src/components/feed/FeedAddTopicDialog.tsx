"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { useFeed } from "@/contexts/feed-context";
import { Button } from "@/components/ui/button";

export function FeedAddTopicDialog() {
  const { addTopicOpen, closeAddTopic, addTopic } = useFeed();
  const [topic, setTopic] = useState("");

  useEffect(() => {
    if (addTopicOpen) setTopic("");
  }, [addTopicOpen]);

  if (!addTopicOpen) return null;

  function handleSubmit() {
    addTopic(topic);
    setTopic("");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Add topic"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Follow a topic</h2>
          <Button type="button" variant="ghost" size="icon-sm" onClick={closeAddTopic}>
            <X className="size-4" />
          </Button>
        </div>

        <input
          autoFocus
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSubmit();
            if (event.key === "Escape") closeAddTopic();
          }}
          placeholder="e.g. synthetic biology"
          className="mb-3 h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeAddTopic}>
            Cancel
          </Button>
          <Button type="button" disabled={!topic.trim()} onClick={handleSubmit}>
            Follow topic
          </Button>
        </div>
      </div>
    </div>
  );
}
