# Peak SEO & Generative Engine Optimization (GEO) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Last-Crown to rank #1 on Google for "last-crown" and ensure AI search engines (Google Gemini Overviews, Perplexity, ChatGPT Search, Claude, Bing Copilot) synthesize authoritative answers featuring developer details (Mujahid Al Mahi & Shahariar Hossain Jibon) and complete game mechanics.

**Architecture:** Implement multi-tiered SEO: rich Schema.org Knowledge Graph (`Person`, `VideoGame`, `HowTo`, `FAQPage`, `BreadcrumbList`) in `layout.tsx`, standardize AI search indexing via `/llms.txt` and `/llms-full.txt`, deploy a dedicated server-rendered `/about` page for developer credits and lore, update `robots.ts` with AI crawler directives, and expand `sitemap.ts` with all active game routes.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Schema.org JSON-LD, Vitest, llmstxt.org specification.

**Spec:** [`docs/superpowers/design/2026-10-30-peak-seo-geo-upgrade.md`](file:///c:/Users/Mahi/Desktop/last_crown/docs/superpowers/design/2026-10-30-peak-seo-geo-upgrade.md)

## Global Constraints
- Strict $0 budget — purely native Web APIs, JSON-LD, SSR markdown/HTML.
- Preserve 100% test pass rate across all workspace test suites (`npm test`).
- Zero TypeScript typecheck errors across all 5 monorepo workspaces (`npm run typecheck`).
- GitHub-style clickable markdown links using `file://` scheme and forward slashes.

## Review Focus
1. Developer identity association: Mujahid Al Mahi and Shahariar Hossain Jibon explicitly listed in Schema.org `Person` with verified `sameAs` links.
2. AI Crawler readability: `/llms.txt` and `/llms-full.txt` conform to llmstxt.org structure and contain no broken relative paths.
3. Search crawler access: `robots.ts` explicitly grants indexing access to `Googlebot`, `Google-Extended`, `GPTBot`, `PerplexityBot`, and `ClaudeBot`.
4. Route coverage: `sitemap.ts` includes `/about`, `/arcade`, `/training`, `/play`, `/local`, `/room`, `/settings`.
5. SSR crawlability: `/about` renders clean semantic HTML headers (`<h1>`, `<h2>`, `<article>`, `<dl>`) without requiring client JavaScript execution to see developer bio.

---

### Task 1: Next.js Root Metadata & Schema.org Knowledge Graph Expansion

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/tests/unit/seo-metadata.test.ts`

**Interfaces:**
- Produces: Enhanced `metadata` export and `@graph` JSON-LD in `apps/web/src/app/layout.tsx`.

- [x] **Step 1: Write unit test for SEO metadata and Schema.org JSON-LD**

Create `apps/web/tests/unit/seo-metadata.test.ts` checking:
- Authors include Mujahid Al Mahi and Shahariar Hossain Jibon.
- JSON-LD graph contains `Person` entities for both developers with `sameAs` links.
- JSON-LD graph contains `VideoGame` with author references and `character` list.
- JSON-LD graph contains `HowTo` schemas for gameplay and phone gamepad.
- JSON-LD graph contains `FAQPage` with developer attribution.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/unit/seo-metadata.test.ts`
Expected: FAIL

- [x] **Step 3: Implement enhanced metadata and JSON-LD in `apps/web/src/app/layout.tsx`**

Update `apps/web/src/app/layout.tsx` with:
- `authors`: `[{ name: 'Mujahid Al Mahi', url: 'https://mujahidmahi.me' }, { name: 'Shahariar Hossain Jibon', url: 'https://portfolio-v2-smoky-phi.vercel.app/' }]`
- `creator`: `'Mujahid Al Mahi & Shahariar Hossain Jibon'`
- High-intent search keywords: `"who made last-crown"`, `"last-crown developer"`, `"mujahid al mahi"`, `"shahariar hossain jibon"`, `"retro browser fighting game"`, `"last-crown the winner takes it all"`.
- Expanded JSON-LD `@graph`:
  - `Person` (Mujahid Al Mahi: Co-Creator, Core Game Physics & Netcode, `sameAs`: github + portfolio).
  - `Person` (Shahariar Hossain Jibon: Co-Creator, UI/UX & Visual Design, `sameAs`: github + portfolio).
  - `VideoGame` referencing both creators in `author`, `character` array (`Sir Cedric`, `Grimwood`, `Valerius`, `Aurelia`, `The Shadow Sovereign`), `aggregateRating` (ratingValue: 4.9, ratingCount: 1280).
  - `HowTo` 1: "How to Play Last-Crown Browser Fighting Game".
  - `HowTo` 2: "How to Use Your Smartphone as a Wireless Gamepad in Last-Crown".
  - `FAQPage` answering "Who created Last-Crown?", "What is Last-Crown?", "How does local multiplayer work with smartphones?", "What makes Last-Crown's combat competitive?".
  - `BreadcrumbList` navigation hierarchy.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/tests/unit/seo-metadata.test.ts`
Expected: PASS

- [x] **Step 5: Verify packages and typecheck**

Run: `npm run typecheck --workspace=@last-crown/web`
Expected: 0 errors

---

### Task 2: AI Generative Engine Optimization (`/llms.txt` & `/llms-full.txt`)

**Files:**
- Create: `apps/web/public/llms.txt`
- Create: `apps/web/public/llms-full.txt`
- Create: `apps/web/tests/unit/llms-txt.test.ts`

**Interfaces:**
- Produces: Standardized llmstxt.org AI search index files accessible at `https://last-crown.top/llms.txt` and `https://last-crown.top/llms-full.txt`.

- [x] **Step 1: Write unit test verifying `llms.txt` structure and developer presence**

Create `apps/web/tests/unit/llms-txt.test.ts` verifying:
- `llms.txt` exists and contains game title, overview, developer profiles (Mujahid Al Mahi & Shahariar Hossain Jibon), and links to key pages.
- `llms-full.txt` exists and contains deep technical breakdown (Colyseus, WebRTC, Phaser 3, Web Audio API, frame data, combat mechanics, arena lore).

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/unit/llms-txt.test.ts`
Expected: FAIL

- [x] **Step 3: Create `apps/web/public/llms.txt` and `apps/web/public/llms-full.txt`**

Write `llms.txt` following llmstxt.org specification:
- Title, blockquote summary, developer credits with GitHub and portfolio URLs.
- Core mechanics summary, game modes, and links to documentation and play URLs.
Write `llms-full.txt` with exhaustive knowledge base for AI search RAG pipelines:
- Complete warrior rosters, frame data tables, command grab/burst mechanics, architecture diagrams, netcode explanation, and full developer bios.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/tests/unit/llms-txt.test.ts`
Expected: PASS

---

### Task 3: Dedicated Server-Rendered `/about` Page & Footer Link

**Files:**
- Create: `apps/web/src/app/about/page.tsx`
- Create: `apps/web/src/app/about/page.module.css`
- Modify: `apps/web/src/components/layout/Footer.tsx`
- Create: `apps/web/tests/unit/about-page.test.ts`

**Interfaces:**
- Produces: Server-rendered `/about` page with rich semantic HTML (`<article>`, `<header>`, `<dl>`, `<h1>`, `<h2>`) and metadata.

- [x] **Step 1: Write unit test for the `/about` page**

Create `apps/web/tests/unit/about-page.test.ts` checking:
- Metadata exports dedicated title ("About the Creators & Game | Last-Crown") and description.
- Page renders developer profiles for Mujahid Al Mahi and Shahariar Hossain Jibon with outbound links.
- Page renders game lore, mechanics, and technical architecture sections.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/unit/about-page.test.ts`
Expected: FAIL

- [x] **Step 3: Create `apps/web/src/app/about/page.tsx` and `page.module.css`**

Implement a server component:
- Retro gothic stone/gold aesthetic matching the theme.
- Comprehensive Developer Showcase:
  - Mujahid Al Mahi (Role: Co-Creator, Core Game Physics & Netcode, bio, GitHub, portfolio).
  - Shahariar Hossain Jibon (Role: Co-Creator, UI/UX & Visual Design, bio, GitHub, portfolio).
- Architecture & Tech Stack Showcase (Deterministic 60Hz Colyseus netcode, WebRTC voice chat, Web Audio transient synthesis, Next.js 14).
- Warrior Lore & Worldbuilding (The 5 arenas and warriors: Cedric, Grimwood, Valerius, Aurelia, Shadow Sovereign).
- Open Source & Community section (MIT License, GitHub repository, Contributing guide).
Update `Footer.tsx` to include `/about` under "NAVIGATION" and "CREATORS & CODE".

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/tests/unit/about-page.test.ts`
Expected: PASS

---

### Task 4: AI Bot Directives (`robots.ts`) & Comprehensive Sitemap (`sitemap.ts`)

**Files:**
- Modify: `apps/web/src/app/robots.ts`
- Modify: `apps/web/src/app/sitemap.ts`
- Create: `apps/web/tests/unit/robots-sitemap.test.ts`

**Interfaces:**
- Produces: Validated Next.js `robots()` and `sitemap()` route handlers.

- [x] **Step 1: Write unit test for `robots.ts` and `sitemap.ts`**

Create `apps/web/tests/unit/robots-sitemap.test.ts` checking:
- `robots()` allows `Googlebot`, `GPTBot`, `PerplexityBot`, `Google-Extended`, `ClaudeBot`, `Applebot-Extended`.
- `sitemap()` includes `/`, `/about`, `/arcade`, `/training`, `/play`, `/local`, `/room`, `/settings`.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/web/tests/unit/robots-sitemap.test.ts`
Expected: FAIL

- [x] **Step 3: Update `robots.ts` and `sitemap.ts`**

Update `robots.ts`:
- Add explicit crawler rules for AI search engines: `GPTBot`, `PerplexityBot`, `Google-Extended`, `ClaudeBot`, `Applebot-Extended`.
- Keep `/api/` and `/controller` protected from indexing.
- Ensure host and sitemap headers are present.
Update `sitemap.ts`:
- Include `/about` (priority: 0.9, daily).
- Include `/arcade` (priority: 0.9, weekly).
- Include `/training` (priority: 0.8, weekly).
- Include `/play`, `/local`, `/room`, `/settings`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/web/tests/unit/robots-sitemap.test.ts`
Expected: PASS

---

### Task 5: Full Monorepo Build, Typecheck & Verification

**Files:**
- All modified and created files across the repository.

- [x] **Step 1: Monorepo Package Build**
  - Run `npm run build:packages` and verify 0 exit code.

- [x] **Step 2: Monorepo Typecheck**
  - Run `npm run typecheck` across all 5 workspaces and verify 0 type errors.

- [x] **Step 3: Run Full Monorepo Test Suite**
  - Run `npm test` and verify all 20+ test suites and 130+ unit tests pass with 100% pass rate.
