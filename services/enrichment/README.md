# Paperama enrichment service

Python sidecar for the Next.js app. **Returns URLs and text only — never downloads PDFs or saves images to disk.**

| Endpoint | Engine | Purpose |
|----------|--------|---------|
| `POST /summarize` | [sumy](https://github.com/miso-belica/sumy) LexRank | 2-sentence card TLDR from abstract |
| `POST /figures` | [crawl4ai](https://github.com/unclecode/crawl4ai) | Hero image URL from OA landing page |

## Setup

```bash
npm run setup:enrichment   # clones vendor/sumy + installs deps + playwright
npm run enrichment:dev     # http://127.0.0.1:8100
```

Set in `.env.local`:

```
ENRICHMENT_SERVICE_URL=http://127.0.0.1:8100
```

## Smoke

```bash
npm run smoke:enrichment
```
