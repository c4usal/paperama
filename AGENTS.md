<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Paperama

Academic paper discovery feed. Follow **`docs/IMPLEMENTATION.md`** top to bottom.

## What this is

- OpenAlex assembles cards at request time — no local paper corpus in v1
- **Read** = external OA link (`oaUrl`), new tab — never an in-app reader
- One hero image per card — real figures only, no topic gradient placeholders in product
- User DB (saves, follows, signals) comes later (Group 5+)

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn/ui · TypeScript strict

## Commands

```bash
npm run dev          # dev server
npm run check        # lint + typecheck + build
npm run smoke:openalex | smoke:feed | smoke:figures | smoke:enrichment
npm run setup:enrichment   # Python sidecar (sumy + crawl4ai)
npm run enrichment:dev     # start sidecar on :8100
```

## Code style

- TypeScript strict, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utilities, 2-space indent
- Minimal diffs — match existing patterns in `src/lib/openalex`, `src/lib/figures`, `src/lib/feed`
