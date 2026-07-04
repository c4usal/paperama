# Paperama — Full Product & Technical Specification

**Version:** 0.1 (living doc)  
**Last updated:** July 2026  
**Status:** Phase 0 complete (UI scaffold) → Phase 1–4 defined below

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Product positioning](#2-product-positioning)
3. [What exists today (Phase 0)](#3-what-exists-today-phase-0)
4. [Gap inventory — everything not built](#4-gap-inventory--everything-not-built)
5. [System architecture](#5-system-architecture)
6. [Data model](#6-data-model)
7. [Ingestion & scraping pipeline](#7-ingestion--scraping-pipeline)
8. [Figures pipeline (the pictures loop)](#8-figures-pipeline-the-pictures-loop)
9. [Search](#9-search)
10. [Cold start & onboarding](#10-cold-start--onboarding)
11. [Follow graph & social primitives](#11-follow-graph--social-primitives)
12. [Engagement signals & ranking](#12-engagement-signals--ranking)
13. [AI summarization](#13-ai-summarization)
14. [Feed loops (end-to-end)](#14-feed-loops-end-to-end)
15. [API surface](#15-api-surface)
16. [Monolith & ML infrastructure](#16-monolith--ml-infrastructure)
17. [Phased roadmap](#17-phased-roadmap)
18. [Implementation map (files)](#18-implementation-map-files)
19. [Open decisions](#19-open-decisions)

---

## 1. Executive summary

**Paperama** is a discovery feed for academic papers — TikTok/Tinder mental model applied to research literature. Users scroll one paper per viewport, see a hero figure, a short summary, and lightweight actions (save, discuss, share, read). Personalization should feel magical but honest: explicit follows and field picks during cold start, then weighted behavioral signals over time.

**Current maturity:** ~15–20% of a shippable product. The **feed shell, layout, and client-side interaction patterns are strong**. There is **no backend, database, ingestion, auth, real search index, recommendation engine, or onboarding flow**.

**Advisor priority order (blocks algorithm work):**
1. **Cold start** — onboarding picks, not inference; show explicit "why"
2. **Skip/dislike signal design** — soft skip vs strong negative with optional reason chips
3. **Positioning** — v1 = discovery serendipity; literature-review/compare = v2
4. **AI summary trust** — label, constrain prompts, always expose abstract

**Pitch line:** *"Paperama is a discovery feed, not a search tool."*

---

## 2. Product positioning

### v1 — own discovery (ship this)

| In scope | Out of scope (v2+) |
|----------|-------------------|
| Infinite vertical scroll feed | Side-by-side paper comparison |
| One card = one paper, one glance | Literature-review table mode |
| Serendipity: "what's new I should know about" | Citation graph explorer |
| Save → library tab | Zotero/Mendeley sync |
| Follow researchers/journals/topics | Institutional SSO |
| Search as filter/discovery aid | Full boolean search UI |
| AI summary on card (labeled) | AI chat over corpus |
| Read → detail page with abstract | Inline PDF viewer |

The swipe/card format **is** the product for v1. Do not bloat the card with comparison tools, full abstracts, or export flows. Saved papers can later get a **list/table view** (v2) without touching the feed card.

### Competitive frame

- **R Discovery** — traditional feed aggregator, 250M+ papers, freemium. Functional, low delight.
- **Paperama hook** — gesture-native scroll, figure-first cards, honest personalization, biochem-adjacent seed taxonomy.
- **Differentiation** — micro-interactions, visual figure carousel, explicit "Matches: …" provenance, anti–analysis-paralysis framing.

---

## 3. What exists today (Phase 0)

### Routes

| Route | File | Status |
|-------|------|--------|
| `/` | `src/app/page.tsx` | Feed via `FeedLayout` |
| `/paper/[id]` | `src/app/paper/[id]/page.tsx` | Reader (Tufte prose, placeholder discuss) |

### Layout shell (TikTok-style)

```
┌──────────────┬─────────────────────────────┬──────┐
│ FeedNavSidebar│  PaperFeed (snap scroll)   │ ↑↓  │
│ (xl: expanded │  ┌─────────┬───┐          │scroll│
│  lg: icon rail)│  │  Card   │act│          │ nav │
│              │  └─────────┴───┘          │      │
└──────────────┴─────────────────────────────┴──────┘
```

**Key components (active):**

| Component | Role |
|-----------|------|
| `FeedLayout.tsx` | Three-column shell |
| `FeedNavSidebar.tsx` | Search, tabs, following list (xl expanded / lg rail) |
| `FeedMobileHeader.tsx` | Tabs on `<lg` |
| `PaperFeed.tsx` | Snap scroll, IntersectionObserver, infinite prefetch |
| `PaperFeedCard.tsx` | Figure, title, Matches tag, summary, Read CTA |
| `VisualCenterpiece.tsx` | Figure carousel (← →, counter) |
| `FeedActionRail.tsx` / `FeedViewportRail.tsx` | Save · Discuss · Share |
| `FeedScrollNav.tsx` | Pinned ↑↓ beside feed column |
| `FeedSearchDialog.tsx` | Debounced search preview |
| `FeedAddTopicDialog.tsx` | Add topic to following |

### State & data (client-only)

| Layer | File | Behavior |
|-------|------|----------|
| Context | `src/contexts/feed-context.tsx` | Tabs, filter, search, saves, following, engagement, toasts |
| Storage | `src/lib/feed-storage.ts` | `localStorage`: saved, following, engagement |
| Query | `src/lib/feed-query.ts` | Tab/filter/search over 6 seed papers |
| Mock data | `src/lib/mock-papers.ts` | `SEED_PAPERS` (6 items), `instantiatePaper()`, `resolvePaper()` |
| Following defaults | `src/lib/following-data.ts` | 3 researchers, 3 journals, 3 topics (hardcoded) |

### Working interactions

- **Tabs:** For You / Following / Saved / Topics
- **Search:** Substring match on title, abstract, tldr, authors, journal, interestLabel
- **Save / Discuss / Share:** Persisted locally; discuss navigates to `/paper/[id]#discuss`
- **Read:** Navigates to paper detail page
- **Follow entity click:** Filters feed + switches tab (does not add to following list)
- **Add topic:** Only way to mutate following today

### Feed query logic (current)

| Tab | Filter rule |
|-----|-------------|
| For You | All seeds — **no ranking, no personalization** |
| Following | Author ⊃ followed researcher OR journal ⊃ followed journal OR interestLabel = followed topic |
| Saved | `seedId` in localStorage saved set |
| Topics | `interestLabel` matches any followed topic |

Pagination loops matching seeds up to 20 pages × 3 items, bumping `reads` artificially.

### Types (canonical)

```ts
// src/types/paper.ts
PaperFeedItem {
  id, seedId, title, type, publishedAt, reads,
  saveCount?, citations?, journal, authors[],
  figures[], extraFigureCount?, socialProofCount?,
  pdfUrl?, interestLabel?, abstract?, tldr?
}

// src/types/feed.ts
FeedNavTab = "for-you" | "following" | "saved" | "topics"
FollowingState { researchers[], journals[], topics[] }
```

### Orphaned / unused

`WelcomeCard.tsx`, `FeedSidebar.tsx`, `SiteHeader.tsx`, `FeedTabs.tsx`, `FigureStrip.tsx` — built, not wired.

### Known bugs / debt

- Mock figures reference `/images/research-figure-micro.jpg` but `public/images/` only has `research-figure-1.png` → **broken hero images**
- `package.json` name still `ai-website-clone-template`
- Share count uses `citations` as base — inconsistent
- Saving does not affect For You ranking (sidebar copy implies it will)
- No tests

---

## 4. Gap inventory — everything not built

### Critical path (blocks "real product")

| # | Gap | Impact |
|---|-----|--------|
| G1 | **No database** | Nothing persists across devices; no paper corpus |
| G2 | **No ingestion pipeline** | 6 hand-written seeds only |
| G3 | **No auth / user identity** | No accounts, no per-user rank state |
| G4 | **No onboarding** | Cold start is fake (default follows injected) |
| G5 | **No skip / dislike gestures** | Missing half the signal model |
| G6 | **No ranking engine** | For You = unfiltered loop |
| G7 | **No real search index** | 6-paper substring filter |
| G8 | **No figure extraction** | One shared placeholder image |
| G9 | **No AI summary generation** | Hand-written `tldr` strings |
| G10 | **Follow system incomplete** | Can't follow/unfollow researchers or journals from UI |

### Important (v1 polish)

| # | Gap |
|---|-----|
| G11 | Follow author/journal from card |
| G12 | Entity pages (`/researcher/[id]`, `/journal/[id]`, `/topic/[slug]`) |
| G13 | Dedicated `/search` results page |
| G14 | Notifications ("X published a new paper") |
| G15 | Discussion threads (placeholder only) |
| G16 | PDF access (`pdfUrl` unused) |
| G17 | Export to Zotero/BibTeX |
| G18 | `interestLabel` / match-reason provenance from ranker |
| G19 | First-run flag + onboarding route |
| G20 | Spot-check tooling for AI summaries |

### Deferred (v2+)

| # | Gap |
|---|-----|
| G21 | Compare / table mode from Saved |
| G22 | BibTeX library import for cold start |
| G23 | Lab shared stacks |
| G24 | Audio abstract playback |
| G25 | Institutional access (GetFTR / LibKey) |
| G26 | Premium tier / monetization |
| G27 | Full Monolith-scale real-time training |

---

## 5. System architecture

### Target topology

```
                    ┌─────────────────────────────────────┐
                    │           Next.js App               │
                    │  (App Router, RSC + client islands) │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │  API Routes │         │  Auth       │         │  CDN        │
   │  /api/*     │         │  (Clerk /   │         │  (figures,  │
   │             │         │   Supabase) │         │   avatars)  │
   └──────┬──────┘         └─────────────┘         └─────────────┘
          │
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                     PostgreSQL (primary)                    │
   │  papers · authors · journals · figures · embeddings ·       │
   │  users · follows · signals · summaries · search_index       │
   └─────────────────────────────────────────────────────────────┘
          ▲                        ▲
          │                        │
   ┌──────┴──────┐          ┌──────┴──────┐
   │  Ingestion  │          │  Workers    │
   │  (cron /    │          │  (summary,  │
   │   queue)    │          │   embed,    │
   │             │          │   figures)  │
   └──────┬──────┘          └─────────────┘
          │
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  External sources (no scraping HTML where API exists)       │
   │  OpenAlex · Crossref · arXiv · PubMed · Semantic Scholar    │
   └─────────────────────────────────────────────────────────────┘
```

### Recommended stack (pragmatic v1)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| DB | **PostgreSQL** (Supabase or Neon) | Relational fits papers/authors/journals; pgvector for embeddings |
| ORM | **Drizzle** or Prisma | Type-safe, migrations |
| Auth | **Clerk** or Supabase Auth | Fastest path to user identity |
| Search | **PostgreSQL FTS** → Typesense/Meilisearch at scale | Start simple |
| Queue | **Inngest** or BullMQ + Redis | Ingestion + summary jobs |
| Object storage | **S3 / R2** | Figure images, cached PDFs |
| Embeddings | **OpenAI text-embedding-3-small** or local | Paper + user interest vectors |
| LLM summaries | **GPT-4o-mini** or Claude Haiku | Cost-effective at scale |

### What we are NOT building first

- Custom scrapers for publisher sites (ToS risk, brittle)
- Self-hosted Monolith cluster
- Real-time streaming training
- Multi-region serving

---

## 6. Data model

### Core entities

```sql
-- Papers (canonical record per DOI or arXiv ID)
papers (
  id              UUID PK,
  external_id     TEXT UNIQUE,        -- openalex:W123, arxiv:2401.12345
  doi             TEXT,
  title           TEXT NOT NULL,
  abstract        TEXT,
  type            TEXT,               -- article | preprint | conference | review
  published_at    TIMESTAMPTZ,
  pdf_url         TEXT,
  open_access     BOOLEAN,
  citation_count  INT DEFAULT 0,
  read_count      INT DEFAULT 0,      -- aggregated from signals
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
)

-- Normalized authors (OpenAlex author IDs)
authors (
  id              UUID PK,
  openalex_id     TEXT UNIQUE,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT
)

paper_authors (paper_id, author_id, position INT)

journals (
  id              UUID PK,
  openalex_id     TEXT UNIQUE,
  name            TEXT NOT NULL,
  logo_url        TEXT
)

papers.journal_id → journals

-- Figures (extracted or linked)
figures (
  id              UUID PK,
  paper_id        UUID FK,
  position        INT,                -- 0 = hero
  source          TEXT,               -- openalex | pmc | pdf_extract | manual
  storage_url     TEXT NOT NULL,     -- CDN path
  width           INT,
  height          INT,
  caption         TEXT,
  created_at      TIMESTAMPTZ
)

-- AI summaries (versioned, auditable)
summaries (
  id              UUID PK,
  paper_id        UUID FK,
  model           TEXT,
  prompt_version  TEXT,
  tldr            TEXT NOT NULL,
  created_at      TIMESTAMPTZ,
  spot_check_passed BOOLEAN
)

-- Topics / fields (seed taxonomy)
topics (
  id              UUID PK,
  slug            TEXT UNIQUE,        -- plant-biology
  label           TEXT,               -- Plant Biology
  parent_id       UUID FK NULL          -- hierarchy optional
)

paper_topics (paper_id, topic_id, confidence FLOAT)

-- Embeddings for ranking
paper_embeddings (paper_id, vector VECTOR(1536))
```

### User & social

```sql
users (
  id              UUID PK,
  auth_provider_id TEXT UNIQUE,
  display_name    TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ
)

-- Explicit follows (onboarding + in-app)
user_follows (
  user_id         UUID FK,
  entity_type     TEXT,               -- researcher | journal | topic
  entity_id       UUID,               -- authors.id | journals.id | topics.id
  created_at      TIMESTAMPTZ,
  UNIQUE (user_id, entity_type, entity_id)
)

-- Field picks from onboarding
user_field_picks (user_id, topic_id)

user_saved_papers (user_id, paper_id, saved_at)

-- Engagement signals (the training data)
user_signals (
  id              UUID PK,
  user_id         UUID FK,
  paper_id        UUID FK,
  signal_type     TEXT,               -- see §12
  reason          TEXT NULL,          -- not_my_field | already_read | not_interested
  weight          FLOAT,              -- precomputed
  session_id      TEXT,
  created_at      TIMESTAMPTZ
)

-- Impression log (what was shown, in what order)
feed_impressions (
  user_id, paper_id, position, tab, match_reason, created_at
)
```

### Extended `PaperFeedItem` (API response shape)

Extend current type for production:

```ts
type PaperFeedItem = {
  // existing fields ...
  doi?: string;
  openAlexId?: string;
  matchReason?: MatchReason;   // replaces bare interestLabel
  summarySource: "ai" | "abstract_fallback";
  figureCount: number;
  hasPdf: boolean;
};

type MatchReason =
  | { type: "followed_researcher"; name: string }
  | { type: "followed_journal"; name: string }
  | { type: "followed_topic"; name: string }
  | { type: "trending_in_field"; topic: string }
  | { type: "similar_to_saved"; paperTitle: string }
  | { type: "explore" };  // serendipity bucket — label sparingly
```

UI maps `matchReason` → **"Matches: …"** or **"Since you followed [X]"** during cold start.

---

## 7. Ingestion & scraping pipeline

### Principle: APIs first, scrape never (for v1)

| Source | Use for | API |
|--------|---------|-----|
| **OpenAlex** | Primary catalog, authors, journals, topics, citations | `api.openalex.org` (free, polite pool) |
| **Crossref** | DOI metadata fallback | `api.crossref.org` |
| **arXiv** | Preprints, PDF URLs | arXiv API |
| **PubMed / PMC** | Biomed, figure links (Open Access) | E-utilities, PMC OA |
| **Semantic Scholar** | Embeddings, TLDR (optional), recommendations | S2 API (rate limits) |

### Ingestion stages

```
1. DISCOVER
   └─ Poll OpenAlex by topic/concept IDs (biochem seed taxonomy)
   └─ Poll followed-entity feeds (new works by author/journal)
   └─ arXiv RSS/API for preprint categories

2. NORMALIZE
   └─ Dedupe by DOI > arXiv ID > title fuzzy match
   └─ Resolve authors, journals to canonical IDs
   └─ Map OpenAlex concepts → internal topics

3. ENRICH
   └─ Queue: figure extraction (§8)
   └─ Queue: AI summary generation (§13)
   └─ Queue: embedding generation

4. INDEX
   └─ Upsert papers + FTS document
   └─ Update topic aggregates (trending counts)

5. SERVE
   └─ Ranker reads from DB + user signals
   └─ Feed API returns paginated cursor
```

### Worker jobs

| Job | Trigger | Output |
|-----|---------|--------|
| `ingest.openalex.topic` | Cron daily | New papers per topic |
| `ingest.openalex.author` | User follows researcher | Backfill + watch |
| `ingest.openalex.journal` | User follows journal | Backfill + watch |
| `enrich.summary` | Paper inserted | `summaries` row |
| `enrich.embed` | Paper inserted | `paper_embeddings` row |
| `enrich.figures` | Paper inserted | `figures` rows + CDN upload |

### Seed taxonomy (biochem-adjacent launch niche)

Initial onboarding field list (advisor suggestion):

- Plant Biology
- Synthetic Biology
- Biosecurity
- Microbiome
- Climate & Hydrology
- ML for Science
- Crop Pathology
- Precision Nutrition

Map each to OpenAlex concept IDs for ingestion queries.

### Rate limits & caching

- OpenAlex: mailto in User-Agent, 10 req/s polite pool
- Cache metadata 24h; re-fetch citation counts weekly
- Store raw API payloads in `ingestion_raw` table for replay/debug

---

## 8. Figures pipeline (the pictures loop)

### Current state

- `VisualCenterpiece` carousel works (prev/next, counter, placeholder slides)
- All 6 seeds point to missing `/images/research-figure-micro.jpg`
- `extraFigureCount` shows "+N more" slides without images
- `FigureStrip.tsx` (4-thumb RG style) exists but unused

### Target behavior

1. **Hero figure** (position 0) always shown on card — `aspect-video`, object-cover
2. **Additional figures** swipeable in carousel; count badge `1 / N`
3. **Fallback ladder** when no figure exists:
   ```
   PMC OA figure → PDF first page render → OpenAlex thumbnail (if any)
   → journal logo → generated gradient placeholder with topic icon
   ```
4. **Never show broken image** — `VisualCenterpiece` already has placeholder path; enforce at data layer

### Extraction sources (priority order)

| Priority | Source | Method |
|----------|--------|--------|
| 1 | PMC Open Access | Parse `fig` URLs from JATS XML |
| 2 | arXiv | Source figure files from arXiv source tarball |
| 3 | PDF | First-page render (pdf2image) + figure detection (optional, expensive) |
| 4 | Publisher | Only if licensed; skip paywalled scraping |

### Storage

```
s3://paperama-figures/{paper_id}/{position}.webp
```

- Resize to max 1200px wide, WebP quality 85
- Store width/height for layout stability
- CDN URL in `figures.storage_url`

### Card integration (no UI bloat)

Keep current card structure. Only data changes:

```ts
figures: string[]           // CDN URLs, position 0 = hero
extraFigureCount?: number   // DEPRECATE — use figures.length instead
```

### Immediate fix (Phase 0.5)

1. Fix seed asset path → use `research-figure-1.png` or download real per-paper figures
2. Add 2–3 distinct placeholder images per topic for demo variety

---

## 9. Search

### v1 scope

Search is a **discovery aid**, not the primary use case. Two surfaces:

| Surface | Behavior |
|---------|----------|
| **Feed search dialog** (exists) | Filters current feed / triggers new ranked results |
| **`/search?q=`** (new) | Full results page, paginated, sort by relevance/date/citations |

### Index fields

```
title^3, abstract^2, tldr^2, author_names^2, journal_name, topic_labels
```

### Query types

| Query | Example | Handler |
|-------|---------|---------|
| Keyword | `CRISPR plant` | FTS |
| Author | `author:Pomeroy` | Author ID lookup |
| Journal | `journal:Nature` | Journal filter |
| DOI | `10.1038/...` | Exact match → paper page |
| arXiv | `arxiv:2401.12345` | Exact match |

### Search ↔ feed relationship

- Search results use **same card component** but in list mode (no snap scroll) OR open feed filtered to results
- Search does **not** replace For You ranker — it's an explicit user intent override
- Log `signal_type: search_click` when user opens a paper from search

### Not in v1

- Semantic/vector search (v1.5 — pgvector cosine on query embedding)
- Saved search alerts
- "Ask Paperama" RAG chat

---

## 10. Cold start & onboarding

> Advisor: *Don't personalize on day one — be upfront. Onboarding picks, not inference.*

### First-run detection

```ts
localStorage paperama:onboarding_complete  // migrate to DB with auth
// OR users.onboarding_completed_at IS NULL
```

If not complete → redirect to `/onboarding` before feed.

### Onboarding flow (3 screens)

```
Screen 1 — Welcome
  "Paperama learns what you care about. Let's start with what you already know."
  [Continue]

Screen 2 — Pick your fields (required: 3 of 8)
  □ Plant Biology  □ Synthetic Biology  □ Biosecurity  ...
  [Continue]

Screen 3 — Follow researchers & journals (required: 3–5 total)
  Suggested researchers (from picked fields, OpenAlex top authors)
  Suggested journals (field-specific)
  Search box to add more
  [Start scrolling]
```

### What onboarding seeds

| Data | Used for |
|------|----------|
| `user_field_picks` | Trending-in-field fallback, topic affinity weights |
| `user_follows` | Following tab, match reasons, ingestion watch lists |
| Initial feed | **NOT ML** — explicit: papers from followed entities + trending in picked fields |

### Match reason during cold start

Always show provenance. Examples:

- `Since you followed Asmaa H. Mohamed`
- `Trending in Plant Biology`
- `From Scientific Reports, a journal you follow`

Reuse `interestLabel` slot → generalize to `matchReason` (§6).

### What we explicitly do NOT do

- Fake "personalized for you" without source
- Keyword-only onboarding with no follows
- BibTeX import (v2 — mentioned in `paperama.txt`)

### Wire orphaned `WelcomeCard`

Repurpose or delete. Onboarding is a dedicated route, not a dismissible card in feed.

---

## 11. Follow graph & social primitives

### Current gaps

| Action | Status |
|--------|--------|
| View default follows | ✅ |
| Click entity → filter feed | ✅ |
| Add topic | ✅ |
| Add researcher | ❌ |
| Add journal | ❌ |
| Unfollow | ❌ |
| Follow from paper card | ❌ |
| Follow from reader page | ❌ |
| Sync across devices | ❌ |

### Target follow UX

**From sidebar:**
- Each entity row: click → filter; long-press / `···` menu → Unfollow
- "Add" buttons for researcher, journal, topic (search OpenAlex)

**From paper card:**
- Tap author name → researcher preview sheet → Follow
- Tap journal name → journal preview → Follow

**From reader page:**
- Follow author / journal buttons in header

### Follow → ingestion loop

```
User follows researcher R
  → API POST /api/follows { type: researcher, id }
  → DB user_follows insert
  → Queue ingest.openalex.author(R) — backfill last 2 years
  → Subscribe to daily poll for new works
  → New papers appear in Following tab + boost For You
```

### Following tab vs For You

| Tab | Content |
|-----|---------|
| **Following** | Chronological-ish from followed entities only |
| **For You** | Ranked blend: follows + field affinity + saves similarity + explore |

---

## 12. Engagement signals & ranking

> Advisor: *Saves and Reads are strongest positive. Skip is soft. Explicit dislike is strong negative.*

### Signal taxonomy

| Gesture | `signal_type` | Weight | Notes |
|---------|---------------|--------|-------|
| **Save** | `save` | **+1.0** | Strongest explicit positive |
| **Read** (opened detail, >10s) | `read` | **+0.8** | Strong; track dwell time |
| **Share** | `share` | +0.3 | Social validation |
| **Discuss** (opened thread) | `discuss` | +0.3 | Weaker until real threads |
| **Scroll past** (impression, no action, >2s visible) | `impression` | +0.05 | Weak passive positive |
| **Skip** (scroll away <2s or swipe) | `skip` | **-0.1** | Soft "not now" — noisy |
| **Thumbs down** (explicit) | `dislike` | **-0.7** | Strong negative |
| **Dislike + reason chip** | `dislike` + reason | **-1.0** | Cleanest training signal |

### Dislike UX (advisor spec)

- **Skip** = continue scrolling (no modal, no friction)
- **Thumbs down** = separate action on action rail (below Share)
- Optional reason chips (non-blocking, dismissible):
  - "Not my field"
  - "Already read"
  - "Not interested in this topic"
- Chips appear as small toast/bottom sheet AFTER dislike tap, not before

### Reason → model mapping

| Reason | Effect |
|--------|--------|
| `not_my_field` | Downweight paper's topics; upweight other field picks |
| `already_read` | Hide this paper; mild downweight similar |
| `not_interested` | Downweight paper embedding direction |

### v1 ranker (no Monolith yet)

Simple **weighted score** — fast, debuggable, good enough for launch:

```
score(paper, user) =
    w_topic  * topic_affinity(user, paper.topics)
  + w_follow * follow_boost(user, paper.authors, paper.journal)
  + w_embed  * cosine(user_interest_vector, paper.embedding)
  + w_trend  * trending_in_user_fields(paper)
  + w_explore * exploration_bonus  // ε-greedy, ~10% random diverse
  - w_neg    * sum(negative_signals)
  - w_seen   * impression_fatigue(paper)  // don't repeat shown-in-last-24h
```

**User interest vector** = weighted mean of embeddings from saved + read papers, followed topics' centroid, field picks.

### For You feed assembly

```
1. Candidate generation (500)
   - papers from followed entities (last 90 days)
   - papers in user's field picks (trending)
   - papers similar to last 5 saves (embedding kNN)
   - exploration pool (random from fields)

2. Score + dedupe

3. Diversify (MMR — max marginal relevance)
   - penalize same author/journal/topic back-to-back

4. Return cursor page (20 items)

5. Log impressions
```

### What changes in UI

| Component | Change |
|-----------|--------|
| `FeedActionRail` | Add thumbs-down button |
| `PaperFeed` | Log impression on IntersectionObserver (≥50% visible, 2s) |
| `PaperFeedCard` | Show `matchReason` not just `interestLabel` |
| `feed-context` | `dislikePaper(paper, reason?)`, `logRead(paperId, dwellMs)` |

---

## 13. AI summarization

> Advisor: *Highest trust risk. Never stand alone. Label clearly. Constrain prompts.*

### Display rules

| Surface | Content |
|---------|---------|
| **Feed card** | AI summary (2–3 sentences max) + small "AI summary" label |
| **Tap summary** | Expands inline OR navigates to reader — shows full abstract below |
| **Reader page** | AI summary labeled → Abstract section always present |

### Prompt constraints (hard rules)

```
- Summarize structure only: what was tested, compared, or reviewed; general direction of findings
- Do NOT include specific numbers, percentages, p-values, or sample sizes
- Do NOT use causal language unless explicitly stated in abstract ("X causes Y" → only if abstract says it)
- Do NOT introduce claims, mechanisms, or context not in the abstract
- Use hedged language: "suggests", "reports", "finds evidence for"
- Max 60 words
```

### Pipeline

```
Paper ingested with abstract
  → IF abstract.length < 100: skip LLM, use truncated abstract as tldr
  → ELSE queue enrich.summary
  → Store in summaries table with model + prompt_version
  → Spot-check queue (random 5% + all flagged)
```

### QA before launch

- Manual review of 50–100 summaries vs source abstracts
- Automated checks: number regex, causal verb list, length
- `spot_check_passed` gate before serving to users

### Cost estimate

~$0.0001/summary with GPT-4o-mini. 10k papers ≈ $1.

---

## 14. Feed loops (end-to-end)

### Loop A — Cold start → first meaningful feed

```
Install / sign up
  → /onboarding: pick 3 fields + follow 3–5 entities
  → POST /api/onboarding/complete
  → Worker: backfill papers for follows + field trending
  → Redirect to / with For You tab
  → Cards show "Since you followed X" / "Trending in Plant Biology"
  → User saves 2 papers
  → user_interest_vector updates
  → Next session: more embedding-similar papers surface
```

### Loop B — Daily return

```
Open app
  → GET /api/feed?tab=for-you&cursor=
  → Ranker blends follows + saves + trending + explore
  → Scroll: impressions logged
  → Save strong positive → Saved tab + rank boost
  → Skip soft negative (or ignore)
  → Dislike + reason → strong negative + topic adjustment
  → Read → detail page, dwell tracked
  → Share → clipboard / Web Share API
```

### Loop C — Follow discovery

```
See interesting author on card
  → Tap name → sheet → Follow
  → POST /api/follows
  → Ingestion backfill
  → Following tab populates
  → For You gets follow_boost for that author
```

### Loop D — Search → save → personalize

```
Cmd+K search "biocontrol wheat"
  → /search?q=biocontrol+wheat
  → Click result → reader
  → Save
  → signal_type: save + search_click
  → Future For You: biocontrol affinity up
```

### Loop E — Figures

```
Paper ingested
  → enrich.figures job
  → PMC/arXiv figure → CDN
  → figures[] populated
  → VisualCenterpiece shows real carousel
  → User swipes figures (optional signal: figure_engaged)
```

### Loop F — Ingestion freshness

```
Cron: poll OpenAlex for watched authors/journals + topic concepts
  → New papers normalized + enriched
  → Push notification (v1.5): "New from [followed researcher]"
  → Following tab surfaces immediately
  → For You rank decays older impressions
```

---

## 15. API surface

### Feed

```
GET  /api/feed?tab=for-you&cursor=&limit=20
POST /api/feed/impression  { paperId, position, tab, matchReason }
```

Response: `{ items: PaperFeedItem[], nextCursor, hasMore }`

### Papers

```
GET  /api/papers/:id
GET  /api/papers/:id/figures
```

### Signals

```
POST /api/signals
  { paperId, type: save|read|skip|dislike|share|discuss, reason?, dwellMs? }
```

### Follows

```
GET    /api/follows
POST   /api/follows   { entityType, entityId }
DELETE /api/follows/:id
GET    /api/follows/suggestions?fields=plant-biology,synthetic-biology
```

### Search

```
GET /api/search?q=&page=&sort=relevance|date|citations
```

### Onboarding

```
POST /api/onboarding/complete
  { fieldSlugs: string[], follows: { type, id }[] }
GET  /api/onboarding/status
```

### Auth

All routes except public search require session. Anonymous mode: localStorage fallback with merge-on-signup.

---

## 16. Monolith & ML infrastructure

Reference: [ByteDance Monolith](https://github.com/bytedance/monolith) — TensorFlow-based recommendation framework with **collisionless embedding tables** and **real-time training**. Repository archived October 2025.

### What Monolith offers

- Unique embedding per ID feature (no hash collisions)
- Batch + real-time training for recsys at TikTok scale
- Built for industrial click-through rate prediction

### Fit for Paperama

| Aspect | Assessment |
|--------|------------|
| Scale | Overkill for v1 (<100k users, <1M papers indexed) |
| Ops burden | Requires Linux, Bazel, TensorFlow serving cluster |
| Cold start | Monolith doesn't solve cold start — explicit follows still needed |
| Real-time | Valuable at scale when signal volume is high |
| Archive status | No active maintenance — fork risk |

### Recommendation

**v1:** PostgreSQL + weighted linear ranker + pgvector similarity (§12).  
**v1.5:** Log all signals to warehouse; offline evaluation (nDCG, save rate).  
**v2+:** If DAU >10k and signal volume justifies it, evaluate:
- Lightweight: **LightFM**, **implicit** ALS on sparse matrix
- Heavy: Monolith fork or **Feast** + **Tecton** feature store + simple DL ranker

Monolith is a **north star for scale**, not a v1 dependency. The advisor's signal design (#2) and cold start (#1) matter more than framework choice right now.

---

## 17. Phased roadmap

### Phase 0 — UI scaffold ✅ (done)

- Feed shell, cards, actions, tabs, search dialog, reader, localStorage

### Phase 0.5 — Prototype hardening (1 week)

- [ ] Fix figure asset paths
- [ ] Add skip/dislike UI (mock signals in localStorage)
- [ ] `matchReason` display on cards
- [ ] Wire or delete orphaned components
- [ ] Rename package to `paperama`

### Phase 1 — Data foundation (2–3 weeks)

- [ ] PostgreSQL schema (§6)
- [ ] OpenAlex ingestion worker (seed taxonomy)
- [ ] Replace `mock-papers.ts` with API routes
- [ ] Auth (Clerk/Supabase)
- [ ] Figure pipeline v1 (PMC + placeholder ladder)
- [ ] Migrate localStorage → DB on login

### Phase 2 — Onboarding + signals (2 weeks)

- [ ] `/onboarding` flow (§10)
- [ ] Follow/unfollow UI (§11)
- [ ] Signal logging API (§12)
- [ ] v1 ranker (weighted score)
- [ ] AI summary pipeline + labeling (§13)
- [ ] Abstract expand on card tap

### Phase 3 — Search + polish (2 weeks)

- [ ] `/search` page + FTS index
- [ ] Entity pages (researcher, journal, topic)
- [ ] Impression logging + fatigue
- [ ] Summary spot-check tooling
- [ ] Notifications (email or push) for followed entities

### Phase 4 — v2 prep

- [ ] Saved papers list/table view (compare mode)
- [ ] Vector search
- [ ] Zotero export
- [ ] BibTeX cold-start import
- [ ] Evaluate ML ranker upgrade

---

## 18. Implementation map (files)

### New files to create

```
src/app/onboarding/page.tsx
src/app/search/page.tsx
src/app/researcher/[id]/page.tsx
src/app/journal/[id]/page.tsx
src/app/topic/[slug]/page.tsx

src/app/api/feed/route.ts
src/app/api/papers/[id]/route.ts
src/app/api/signals/route.ts
src/app/api/follows/route.ts
src/app/api/search/route.ts
src/app/api/onboarding/complete/route.ts

src/lib/db/                    # schema, queries
src/lib/ingestion/openalex.ts
src/lib/ingestion/normalize.ts
src/lib/ranking/score.ts
src/lib/ranking/candidates.ts
src/lib/summaries/generate.ts
src/lib/figures/extract.ts

src/components/onboarding/
src/components/feed/DislikeReasonSheet.tsx
src/components/feed/MatchReason.tsx
src/components/feed/SummaryWithLabel.tsx

workers/ or src/jobs/           # ingestion, enrich queues
```

### Files to modify

| File | Changes |
|------|---------|
| `PaperFeedCard.tsx` | `matchReason`, AI summary label, abstract expand |
| `FeedActionRail.tsx` | Add dislike button |
| `feed-context.tsx` | `dislikePaper`, `logImpression`, API calls |
| `feed-query.ts` | Replace with API fetch + cursor |
| `feed-storage.ts` | Anonymous fallback; migrate on auth |
| `types/paper.ts` | `matchReason`, `summarySource`, external IDs |
| `types/feed.ts` | Signal types, onboarding state |
| `VisualCenterpiece.tsx` | Fallback image handling, blur placeholder |
| `paper/[id]/page.tsx` | AI label, follow buttons, real discuss stub |
| `mock-papers.ts` | Delete after Phase 1 |

### Files to delete (after migration)

`FeedSidebar.tsx`, `FeedTabs.tsx`, `SiteHeader.tsx`, `FigureStrip.tsx` (or archive)

---

## 19. Open decisions

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Auth provider | Clerk vs Supabase vs NextAuth | Clerk for speed |
| DB host | Supabase vs Neon | Supabase (auth + DB + storage bundle) |
| Launch niche | Biochem/plant vs ML vs all academia | Biochem-adjacent (your edge) |
| Anonymous use | Require signup vs browse-first | Browse-first with localStorage, prompt signup on save |
| Dislike icon | Thumbs down vs X vs long-press skip | Separate thumbs-down (advisor) |
| Summary expand | Inline on card vs reader only | Tap → reader abstract (keeps card clean) |
| Ingestion scale | 10k vs 100k seed papers | 10k quality > 100k noise for v1 |

---

## Appendix A — Advisor checklist

- [ ] **#1 Cold start:** Onboarding picks, field taxonomy, explicit "why" on cards
- [ ] **#2 Skip signals:** Soft skip vs strong dislike + 3 reason chips
- [ ] **#3 Positioning:** v1 discovery only; compare mode deferred
- [ ] **#4 AI trust:** Label, constrain, abstract always available, spot-check 50–100

## Appendix B — Related docs

| Doc | Path |
|-----|------|
| Feed card component spec | `docs/research/components/feed-card.spec.md` |
| RG page topology | `docs/research/researchgate/PAGE_TOPOLOGY.md` |
| Product brainstorm | `paperama.txt` |

---

*This document is the source of truth for Paperama full functionality. Update it as phases ship.*
