# Paperama

Personalized academic paper discovery. One card per screen, scroll to browse, **Read** opens the real open-access link.

Not a reader. Not a paper database. A feed.

## Stack

Next.js 16 · React 19 · Tailwind v4 · TypeScript · OpenAlex

## Setup

```bash
npm install
cp .env.example .env.local
```

Set `OPENALEX_MAILTO` in `.env.local` (your email — OpenAlex polite pool).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | What |
|---------|------|
| `npm run dev` | Dev server |
| `npm run check` | Lint + typecheck + build |
| `npm run smoke:openalex` | OpenAlex card plumbing |
| `npm run smoke:feed` | Feed assembly |
| `npm run smoke:figures` | Hero image resolvers |

## Docs

- **[docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** — build order (source of truth)
- **[docs/SPEC.md](docs/SPEC.md)** — product background

## Env

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENALEX_MAILTO` | yes | Email for OpenAlex API |
| `SEMANTIC_SCHOLAR_API_KEY` | no | Group 3 TLDR enrichment |
| `DATABASE_URL` | no | Group 5 user state |

## License

MIT
