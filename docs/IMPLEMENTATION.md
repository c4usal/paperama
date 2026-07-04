# Paperama — Implementation Plan

**Follow this doc top to bottom.** Each **Group** is one chunk of work. Finish it, verify in the browser, then move on.

---

## What Paperama actually is

Paperama is **not** a paper database or reading app. It is a **personalized discovery feed** that shows cards and sends you to the real paper elsewhere.

```
OpenAlex / Semantic Scholar  →  assemble card  →  user scrolls
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              one figure          tldr line      citations + match
                    │                 │                 │
                    └──────── Read opens oa_url in new tab ────┘
```

**We store:** user preferences, saves (IDs + links), signals, follows, and optionally a **thin cache** (tldr + image URL per `openalex_id`) so cards load fast.

**We do not store:** full paper corpus, PDFs, abstracts for hosting, multi-figure galleries, or paywalled content.

### Card anatomy (v1)

```
┌─────────────────────────┐
│  [one hero image]       │  ← Group 4; graphical abstract later
├─────────────────────────┤
│  Title                  │
│  tldr line (subheading) │  ← Group 3; S2 TLDR or snippet
│  Author · Journal · yr  │
│  citations · match tag  │  ← Group 3 plumbing; match = topic label
│  [Read → opens link]    │  ← external OA page, new tab
└─────────────────────────┘
        ♥  💬  ↗  👎
```

**Read** never means "our reader page." It means **open the OA link** (arXiv, PMC, repository).

### Hard constraints

- No paywalled scraping — OpenAlex + OA links only
- No AI summaries (budget) — tldr = Semantic Scholar TLDR when available, else first ~200 chars of abstract from API
- No verbose "Since you followed…" copy — short `Matches: topic` only when useful
- Onboarding: pick 3 fields → scroll; follows skippable, suggested later
- One figure per card for now — carousel / graphical abstract later

**Companion:** `docs/SPEC.md` (background). **This doc** is build order.

---

## Progress tracker

| Group | Name | Status |
|-------|------|--------|
| 0 | Card model & prototype cleanup | ✅ |
| 1 | OpenAlex card plumbing | ✅ |
| 2 | Feed API (live assembly, link-out) | ✅ |
| 3 | TLDR + citations + matches plumbing | ⬜ |
| 4 | Hero image (one per card) | ✅ |
| 5 | User DB (saves, follows, signals only) | ⬜ |
| 6 | Auth & persistence | ⬜ |
| 7 | Onboarding | ⬜ |
| 8 | Follow system | ⬜ |
| 9 | Engagement signals | ⬜ |
| 10 | Ranker v1 | ⬜ |
| 11 | Search (API-backed) | ⬜ |
| 12 | Ship checklist | ⬜ |

---

## Group 0 — Card model & prototype cleanup

**Goal:** UI matches the real product shape before any backend.

**Depends on:** nothing

### Tasks

- [x] **0.1** Fix broken figure path in mocks — use `public/images/research-figure-1.png`
- [x] **0.2** **TLDR as subheading** — card order: Title → `tldr` line (styled subheading) → author/journal meta → citation count + match tag on meta row
- [x] **0.3** **Read = external link** — `PaperFeedCard` Read button → `paper.oaUrl` in new tab (`target="_blank" rel="noopener"`), not `/paper/[id]`
- [x] **0.4** **Single figure** — simplify `VisualCenterpiece` to one image (no carousel arrows for v1); keep placeholder on miss
- [x] **0.5** Add `oaUrl` + `citationCount` + `openAlexId` to `PaperFeedItem` type; update mocks
- [x] **0.6** Simplify or remove `/paper/[id]` — either delete route or make it redirect to `oaUrl`
- [x] **0.7** Delete unused components: `FeedSidebar`, `FeedTabs`, `SiteHeader`, `FigureStrip`, `WelcomeCard`
- [x] **0.8** Rename `package.json` → `paperama`; add `.env.example`

### Done when

- Card shows: one image, title, tldr, meta, citations, match, Read opens a URL
- Build passes; no carousel on card

### Files

`PaperFeedCard.tsx`, `VisualCenterpiece.tsx`, `types/paper.ts`, `mock-papers.ts`, `package.json`

---

## Group 1 — OpenAlex card plumbing

**Goal:** Server-side module that fetches OA works from OpenAlex and returns a **card payload** — not a DB insert.

**Depends on:** Group 0

### Card payload shape

```ts
// src/types/card.ts
type FeedCard = {
  openAlexId: string;       // stable key for saves/signals
  title: string;
  tldr: string;             // filled in Group 3
  authors: string;          // "Surname et al."
  journal: string;
  year: string;
  citationCount: number;
  matchLabel?: string;      // topic slug label, from ranker/context
  oaUrl: string;            // Read opens this
  oaSource: "arxiv" | "pmc" | "repository";
  heroImageUrl?: string;    // filled in Group 4
  type: PaperType;
};
```

### Tasks

- [x] **1.1** `src/lib/openalex/client.ts` — fetch with mailto User-Agent, rate-limit helper
- [x] **1.2** `src/lib/openalex/works.ts` — `fetchWorksByConcept(conceptId, { perPage, cursor })`
- [x] **1.3** `src/lib/openalex/normalize.ts` — OpenAlex work → partial `FeedCard` (title, authors, journal, year, citations, oaUrl, oaSource)
- [x] **1.4** **OA filter** — only include works where `open_access.is_oa` OR host is arxiv OR `pmcid` present; set `oaUrl` from `open_access.oa_url` or construct arxiv/PMC URL
- [x] **1.5** **Reject paywalled** — if no OA landing page, drop the work (do not show in feed)
- [x] **1.6** Seed config `src/lib/topics.ts` — 8 fields with OpenAlex concept IDs (same list as before)
- [x] **1.7** Unit smoke: fetch 10 works for one concept, log card payloads — `npm run smoke:openalex`

### Done when

- `normalize(openAlexWork)` returns a valid `FeedCard` with working `oaUrl`
- Zero fetches to publisher domains
- Manual click-test: 5 random `oaUrl`s open real papers

### Files

`src/lib/openalex/*`, `src/types/card.ts`, `src/lib/topics.ts`

---

## Group 2 — Feed API (live assembly, link-out)

**Goal:** `GET /api/feed` assembles cards from OpenAlex at request time (with short cache). No papers table.

**Depends on:** Group 1

### Tasks

- [x] **2.1** `GET /api/feed?tab=&cursor=&fields=` — for v0: fetch works for user's field concept IDs, sort by `publication_date` desc
- [x] **2.2** In-memory or Redis cache (optional v0: Next.js `unstable_cache` 15min TTL per concept page)
- [x] **2.3** Map each work → `FeedCard`; assign temporary `id` = `openAlexId` for React keys
- [x] **2.4** Tabs (v0 filtering):
  - `for-you` — all fields user picked (Group 7; until then all 8 topics)
  - `saved` — filter to `openAlexId`s in user saves (Group 5)
  - `following` — filter by followed author/journal IDs (Group 8)
  - `topics` — filter by topic slug
- [x] **2.5** Cursor = OpenAlex cursor token, pass through
- [x] **2.6** Wire `PaperFeed.tsx` to fetch `/api/feed` instead of `queryFeed()`
- [x] **2.7** Loading skeleton + error state on feed

### Done when

- Feed shows real OpenAlex papers
- Read opens real OA pages
- Infinite scroll loads next OpenAlex page

### Files

`src/app/api/feed/route.ts`, `PaperFeed.tsx`, delete mock feed loop from `feed-query.ts`

---

## Group 3 — TLDR + citations + matches plumbing

**Goal:** Every card has the right subheading and metadata for display + ranker input.

**Depends on:** Group 2

### TLDR (card subheading)

| Priority | Source |
|----------|--------|
| 1 | Semantic Scholar `tldr` field (batch lookup by DOI or S2 paper ID) |
| 2 | First ~200 chars of OpenAlex `abstract_inverted_index` reconstructed |
| 3 | Title fallback (never empty) |

- [ ] **3.1** `src/lib/semantic-scholar/paper.ts` — fetch TLDR by DOI (optional API key in env)
- [ ] **3.2** `src/lib/openalex/abstract.ts` — reconstruct abstract from inverted index
- [ ] **3.3** `resolveTldr(work)` — priority chain above; called during feed assembly
- [ ] **3.4** Style tldr as subheading in `PaperFeedCard` (smaller than title, above meta)

### Citations

- [ ] **3.5** `citationCount` from OpenAlex `cited_by_count` — show on meta row (e.g. "142 citations")
- [ ] **3.6** Pass through to ranker as `recency` tie-breaker input later

### Matches

- [ ] **3.7** `matchLabel` = primary topic label from user's field picks that overlaps work's OpenAlex concepts (e.g. `plant microbiome`)
- [ ] **3.8** Show `Matches: {matchLabel}` only when non-obvious; hide on Following tab
- [ ] **3.9** Store match reason internally for ranker (`fieldMatch` | `followBoost` | `explore`) — **not** shown as prose on card

### Optional thin cache (performance, not corpus)

- [ ] **3.10** Table `card_cache(openalex_id PK, tldr, citation_count, match_label, cached_at)` — write on first fetch, refresh after 7 days
- [ ] **3.11** This is **cache only** — OpenAlex remains source of truth; cache miss = refetch

### Done when

- Cards show real tldr, citation count, and match tag
- tldr is never AI-generated
- Ranker can read `matchLabel` + internal match reason

### Files

`src/lib/semantic-scholar/*`, `src/lib/openalex/abstract.ts`, `PaperFeedCard.tsx`, optional `card_cache` in Group 5 schema

---

## Group 4 — Hero image (one per card)

**Goal:** One hero image per card where possible. Graphical abstract as a later upgrade.

**Depends on:** Group 2  
**Parallel with:** Group 3

### v1 scope

- **One image** — no carousel
- Sources: PMC OA first figure, else topic placeholder
- **Later (not now):** graphical abstract from arXiv, second image slot

### Tasks

- [x] **4.1** `src/lib/figures/resolve-hero.ts` — input: OpenAlex work (pmcid, arxiv id) → output: image URL or null
- [x] **4.2** PMC OA only — fetch first figure URL when `pmcid` present; never hit publisher sites
- [x] **4.3** Placeholder per topic in `public/images/topics/{slug}.png` (8 images) or gradient component
- [x] **4.4** Optional: cache `hero_image_url` in `card_cache` table; optional CDN upload if hotlinking is unreliable — **in-memory cache only for v1**
- [x] **4.5** `VisualCenterpiece` — single `<Image>`; no prev/next buttons

### Done when

- OA papers with PMC figures show real images
- Everything else shows clean placeholder (no broken images)
- One image per card everywhere

### Files

`src/lib/figures/resolve-hero.ts`, `VisualCenterpiece.tsx`, `public/images/topics/*`

---

## Group 5 — User DB (saves, follows, signals only)

**Goal:** PostgreSQL stores **users and behavior** — not a paper library.

**Depends on:** Group 2  
**Can start in parallel with Groups 3–4 once feed works**

### Schema (only this)

```
users                 — id, auth_provider_id, created_at
user_field_picks      — user_id, topic_slug
user_follows          — user_id, entity_type, entity_id, entity_name
user_saves            — user_id, openalex_id, oa_url, saved_at
user_signals          — user_id, openalex_id, signal_type, reason?, created_at
feed_impressions      — user_id, openalex_id, position, tab, created_at
card_cache (optional) — openalex_id, tldr, hero_image_url, citation_count, cached_at
topics (seed)         — slug, label, openalex_concept_id
```

**No `papers` table. No `authors` table. No full-text abstract storage.**

Saves store `openalex_id` + `oa_url` so Saved tab can re-link even if OpenAlex is slow.

### Tasks

- [ ] **5.1** Drizzle + Supabase/Neon setup
- [ ] **5.2** Schema above + migrate
- [ ] **5.3** Seed 8 topics with OpenAlex concept IDs
- [ ] **5.4** `POST/DELETE /api/saves` — `{ openAlexId, oaUrl }`
- [ ] **5.5** Saved tab: load saves from DB → hydrate cards via OpenAlex fetch (or cache)

### Done when

- Save persists `openalex_id` + link
- Saved tab shows saved cards with working Read links
- No paper corpus in DB

### Files

`src/lib/db/schema.ts`, `src/app/api/saves/route.ts`

---

## Group 6 — Auth & persistence

**Goal:** Accounts; localStorage → DB merge on login.

**Depends on:** Group 5

### Tasks

- [ ] **6.1** Clerk or Supabase Auth
- [ ] **6.2** Upsert `users` on login
- [ ] **6.3** Migrate anonymous saves/signals from localStorage
- [ ] **6.4** Prompt signup on first Save

### Done when

- Logged-in user retains saves across devices

---

## Group 7 — Onboarding

**Goal:** Pick 3 fields → feed. No required follows.

**Depends on:** Group 6 (or localStorage pre-auth)

### Tasks

- [ ] **7.1** `/onboarding` — field picker only; one Continue button
- [ ] **7.2** `POST /api/onboarding/complete` → `user_field_picks`
- [ ] **7.3** Feed uses picked fields for OpenAlex concept queries
- [ ] **7.4** Remove hardcoded `DEFAULT_FOLLOWING`

### Done when

- New user picks 3 fields → sees relevant real papers → Read opens links

---

## Group 8 — Follow system

**Goal:** Follow researchers, journals, topics; Following tab filters live OpenAlex results.

**Depends on:** Group 7  
**Parallel with:** Group 9

### Tasks

- [ ] **8.1** `/api/follows` CRUD — store OpenAlex author/journal IDs + display names
- [ ] **8.2** Following tab: fetch works by followed author/journal from OpenAlex
- [ ] **8.3** Follow/unfollow in sidebar; add topic dialog
- [ ] **8.4** Contextual prompt after 2 saves from same author: "Follow {name}?" — skippable
- [ ] **8.5** OpenAlex entity search for add researcher/journal

### Done when

- Following tab shows real papers from followed entities
- Follow state persists; no extra copy on cards

---

## Group 9 — Engagement signals

**Goal:** Log behavior for ranker. Keys = `openalex_id`.

**Depends on:** Group 5  
**Parallel with:** Group 8

### Tasks

- [ ] **9.1** `POST /api/signals` — save, read, skip, dislike, share
- [ ] **9.2** **Read signal** = user clicked Read (opened oa_url) — not dwell on our page
- [ ] **9.3** **Skip** = visible ≥2s, no action, scrolled away
- [ ] **9.4** **Dislike** = thumbs-down + optional reason chips
- [ ] **9.5** Impression log on card serve
- [ ] **9.6** Wire `FeedActionRail` thumbs-down

### Done when

- Clicking Read logs `read` signal
- Dislike works without blocking scroll

---

## Group 10 — Ranker v1

**Goal:** For You orders cards by score, not just date.

**Depends on:** Groups 7, 8, 9

### How ranking works (no local corpus)

1. Fetch candidate pool from OpenAlex (user's fields, last 2 years, OA only) — ~100–200 works
2. Score each in memory using user state + card metadata
3. Return sorted list

### Starting weights (hand-tune)

```ts
export const RANK_WEIGHTS = {
  fieldMatch:        0.35,
  followBoost:       0.25,
  recency:           0.15,
  saveSimilarity:    0.15,  // same matchLabel as saved papers
  exploration:       0.10,
  skipPenalty:      -0.05,
  dislikePenalty:   -0.40,
  impressionFatigue: -0.20,
} as const;
```

### Tasks

- [ ] **10.1** `src/lib/ranking/score.ts`
- [ ] **10.2** `src/lib/ranking/assemble-feed.ts` — fetch candidates → score → diversify → return
- [ ] **10.3** Wire into `GET /api/feed?tab=for-you`
- [ ] **10.4** Offline eval: `docs/eval/feed-eval.json` (20–30 cards, manual labels) + `npm run rank:eval`
- [ ] **10.5** Internal `matchReason` for ranker; card shows short `Matches:` tag only

### Done when

- For You differs from pure chronological
- Weights documented after eval pass

---

## Group 11 — Search (API-backed)

**Goal:** Search without a local corpus index.

**Depends on:** Group 2

### Tasks

- [ ] **11.1** `GET /api/search?q=` → OpenAlex search endpoint + optional S2
- [ ] **11.2** Filter results to OA-only
- [ ] **11.3** Return same `FeedCard` shape
- [ ] **11.4** Wire `FeedSearchDialog`
- [ ] **11.5** Log `search_click` signal

### Done when

- Search finds real OA papers; Read opens links

**No Postgres FTS. No abstract index.**

---

## Group 12 — Ship checklist

**Depends on:** all groups

- [ ] **12.1** `.env.example` — `OPENALEX_MAILTO`, optional `SEMANTIC_SCHOLAR_API_KEY`, auth keys
- [ ] **12.2** `README.md` — Paperama setup; clarify link-out model
- [ ] **12.3** Deploy Vercel + Supabase
- [ ] **12.4** Smoke test: feed, Read opens tab, save, onboarding, dislike
- [ ] **12.5** README note: OA links only; no paywalled scraping; tldr from S2/snippet

---

## Out of scope (v1)

| Item | Notes |
|------|-------|
| Papers table / local corpus | OpenAlex is the catalog |
| `/paper/[id]` reader | Read = external link |
| AI tldr | S2 or snippet only |
| Multi-figure carousel | One hero image; graphical abstract later |
| Paywalled sites | Never |
| PDF hosting | Never |
| Embeddings / Monolith | v2 |
| Zotero, BibTeX, compare mode | v2 |
| Discussion threads | placeholder |

---

## Dependency graph

```
Group 0 ──► Group 1 ──► Group 2 ──┬──► Group 3 (tldr, citations, matches)
                                  ├──► Group 4 (hero image) ‖
                                  └──► Group 11 (search)
                Group 2 ──► Group 5 ──► Group 6 ──► Group 7
                                      ├──► Group 8 ──┐
                                      └──► Group 9 ──┼──► Group 10 ──► Group 12
```

**Solo order:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 → 8 → 10 → 11 → 12

---

## Session prompts

- **Group 0:** "Do Group 0 from docs/IMPLEMENTATION.md — tldr subheading, Read opens oaUrl, single figure."
- **Group 1:** "Do Group 1 — OpenAlex card plumbing, OA filter, no DB."
- **Group 2:** "Do Group 2 — /api/feed live from OpenAlex, wire PaperFeed."

---

*Update the Progress tracker as groups complete.*
