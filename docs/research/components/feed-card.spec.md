# FeedCard Specification (ResearchGate → Paperama)

## Overview

- **Target file:** `src/components/feed/PaperFeedCard.tsx`
- **Screenshot:** `docs/design-references/researchgate/feed-desktop.png`
- **Interaction model:** static card in infinite scroll list

## DOM structure

```
FeedCard
├── SectionHeader ("Suggested research based on your interests")
├── FigureStrip
│   ├── FigureThumb × 4
│   └── FigureThumb (+N overlay)
├── Title (h2, link)
├── MetaRow
│   ├── TypeBadge (Article | Preprint | …)
│   └── Stats (date · reads · citations)
├── JournalRow (logo + name)
├── AuthorList (avatars + names)
├── ActionRow
│   ├── Download (primary outline)
│   ├── Save
│   ├── Follow | Recommend | Share (text buttons)
└── SocialProof ("N researchers follow or recommend…")
```

## Visual tokens (approximate from live page)

- Page background: `#f0f2f5`
- Card background: `#ffffff`
- Card border: `1px solid #e8e8e8`
- Card radius: `4px` (RG is subtle, not heavily rounded)
- Accent / links / Download outline: teal-blue `#0c7eb3` range
- Type badge: light teal bg, dark teal text
- Title: ~18–20px, font-weight 600, near-black
- Meta text: ~13px, gray `#666`
- Card vertical gap in feed: ~16px
- Figure thumbs: ~100px square, 4px gap, `object-fit: cover`

## Paperama remix notes

- Keep card **structure** from RG
- Use **Literata + prose** for expanded abstract (not on card face)
- Figure strip: add Pudding-style colored frame behind hero thumb
- Rename actions: Read · Save · Skip · More like this · Share
- Drop RG branding; use Paperama header instead of RG nav

## Mock data fields

```ts
type PaperFeedItem = {
  id: string;
  title: string;
  type: "article" | "preprint" | "conference" | "review";
  publishedAt: string;
  reads: number;
  citations?: number;
  journal: { name: string; logoUrl?: string };
  authors: { name: string; avatarUrl?: string }[];
  figures: string[];
  extraFigureCount?: number;
  socialProofCount?: number;
  pdfUrl?: string;
};
```
