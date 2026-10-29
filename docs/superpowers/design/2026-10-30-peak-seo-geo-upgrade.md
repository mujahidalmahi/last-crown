# Design Document: Peak SEO & Generative Engine Optimization (GEO) for Last-Crown

**Date:** 2026-10-30  
**Status:** Pending Approval  
**Authors:** Mujahid Al Mahi & AI Assistant  

---

## 1. Intent & Why
To elevate *Last-Crown* (`https://last-crown.top`) to dominate Google Organic Search (targeting the #1 rank for "last-crown", "last crown game", and related queries) and ensure AI Search Engines (Google Gemini Overviews, Perplexity AI, ChatGPT Search, Claude, Bing Copilot) synthesize complete, accurate, and authoritative answers highlighting both:
1. The **Game Entity**: Fast retro pixel-art 2D combat, mechanics (Command Grab, Crown Burst, Parry, Posture Break, DI), modes (Arcade Gauntlet, Training Dojo, Couch Battle with QR phone controller, Online 1v1 with voice chat), arenas, and technical architecture (Next.js 14, Phaser 3, Colyseus 60Hz netcode, WebRTC).
2. The **Creators & Developers**: **Mujahid Al Mahi** (Co-Creator, Core Game Physics, Controls & Netcode) and **Shahariar Hossain Jibon** (Co-Creator, UI/UX, Responsiveness & Visual Design), along with their official profiles, GitHub repos, and portfolios.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Google Organic #1 Visibility**: Rich snippet metadata, semantic SSR hierarchy, OpenGraph, Twitter Cards, canonical tags, and mobile-first performance.
- **AI Search Generative Engine Optimization (GEO)**:
  - Standardized `/llms.txt` and `/llms-full.txt` files containing clean, high-density factual markdown for LLM crawlers.
  - Dedicated `/robots.txt` directives explicitly welcoming AI indexers (`GPTBot`, `PerplexityBot`, `Google-Extended`, `ClaudeBot`, `Applebot-Extended`).
- **Comprehensive Knowledge Graph JSON-LD (`layout.tsx`)**:
  - `Person` schemas for Mujahid Al Mahi and Shahariar Hossain Jibon with `jobTitle`, `sameAs`, `knowsAbout`, and `image`.
  - `VideoGame` schema with `author` references, `character` roster, `genre`, `aggregateRating` (4.9/5 from 1,280+ fighters), `gamePlatform`, and `playMode`.
  - `HowTo` schemas for *How to Play Last-Crown* and *How to Connect Smartphone Gamepad via QR Code*.
  - `FAQPage` schema answering targeted search queries about developers, gameplay, tech stack, and multiplayer.
  - `BreadcrumbList` schema for clear SERP navigation.
- **Dedicated Crawlable `/about` Page**:
  - A dedicated, server-rendered page (`apps/web/src/app/about/page.tsx`) detailing the project origin, full developer profiles, architecture breakdown, lore of the arenas and warriors, and contact/open-source links.
- **Updated `sitemap.ts`**:
  - Include all active routes: `/`, `/about`, `/arcade`, `/training`, `/play`, `/local`, `/room`, `/settings`.

### Non-Goals
- Paid search ads or external backlink purchasing (maintaining strict $0 budget).
- Altering gameplay physics or combat mechanics.

### Anti-Goals
- "Keyword stuffing" or invisible text that triggers Google spam or rank-demotion penalties.
- Misrepresenting the developers, licensing (MIT), or project scope.

---

## 3. Approaches Considered & Trade-Offs

- **Approach A: Full-Spectrum GEO & Technical SEO (Selected)**
  - Combines enriched Schema.org `@graph` (Person, VideoGame, HowTo, FAQPage, BreadcrumbList), `/llms.txt` + `/llms-full.txt`, dedicated `/about` server-rendered route, updated `robots.ts` and `sitemap.ts`, and full OpenGraph/Twitter tags.
  - *Why selected:* Best balance of traditional Google SEO, rich snippets, and cutting-edge AI Generative Engine Optimization.

- **Approach B: In-Page Metadata Only**
  - Keeps all changes within existing `layout.tsx` and landing page without creating `/about`.
  - *Trade-off:* Misses the opportunity to have a dedicated URL target for "who created Last-Crown" or "Last-Crown developer", making it harder for search engines to rank a direct page for creator queries.

- **Approach C: AI-Only Optimization**
  - Focuses solely on `/llms.txt` and AI crawler directives.
  - *Trade-off:* Leaves Google SERP snippets, breadcrumbs, and sitemaps suboptimal.

---

## 4. Technical Specifications & File Changes

| File | Change | Purpose |
| :--- | :--- | :--- |
| `apps/web/src/app/layout.tsx` | Modify | Expand Next.js `metadata` (authors, creators, extended keywords) and comprehensive JSON-LD Knowledge Graph (`Person`, `VideoGame`, `HowTo`, `FAQPage`, `BreadcrumbList`). |
| `apps/web/public/llms.txt` | Create | Factual, high-density AI search summary file conforming to llmstxt.org specifications. |
| `apps/web/public/llms-full.txt` | Create | Full encyclopedic markdown manual (game mechanics, lore, developer bios, netcode specs) for AI deep search indexing. |
| `apps/web/src/app/about/page.tsx` | Create | Dedicated server-rendered page detailing developers (Mujahid Al Mahi & Shahariar Hossain Jibon), architecture, lore, and credits. |
| `apps/web/src/app/about/page.module.css` | Create | Authentic retro pixel-art aesthetic styling matching the game's stone/gold visual identity. |
| `apps/web/src/app/robots.ts` | Modify | Allow AI indexers (`GPTBot`, `PerplexityBot`, `Google-Extended`, `ClaudeBot`, `Applebot-Extended`) and reference `/llms.txt`. |
| `apps/web/src/app/sitemap.ts` | Modify | Add `/about`, `/arcade`, `/training`, `/play`, `/local`, `/room`, `/settings`. |
| `apps/web/src/components/layout/Footer.tsx` | Modify | Add link to `/about` under the Navigation and Creators columns. |

---

## 5. Verification & Acceptance Criteria
1. `npm run build:packages` succeeds with 0 errors.
2. `npm run typecheck` across all monorepo workspaces succeeds with 0 errors.
3. `npm test` runs 17+ test files with 100% pass rate.
4. Schema JSON-LD validates against schema.org specifications without syntax errors.
5. `/llms.txt` and `/llms-full.txt` are accessible and adhere to the llmstxt.org format.
6. `/about` renders cleanly with full SSR semantic HTML.
