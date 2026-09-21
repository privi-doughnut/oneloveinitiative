# CLAUDE.md — One Love Initiative

Project briefing for Claude Code. Last updated: Aug 2026.

## What this is
The **One Love Initiative (OLI)** is a student-led nonprofit in Charlotte, NC that assembles **welfare kits** (general term — bundles of essential items) for individuals and families experiencing hardship. Model: buy supplies in bulk → volunteers assemble standardized "OLI Kits" → distributed through our partner, **Crisis Assistance Ministry (CAM)**. Founder: **Prithivi Vijayakumar**. This repo is the OLI website.
- **"Welfare kits" vs "hygiene kits":** OLI's kits aren't only hygiene items long-term (see "Our Work" — future drives go "beyond hygiene, from clothing to household essentials"). Use **"welfare kits"** for general/org-level descriptions (title tag, meta tags, hero eyebrow, Press "Our Story", etc.). Keep **"hygiene kits"** only where the text is specifically about the current/named drive (the "Children's Hygiene Kit Drive" sections, its fact-rows, and the FAQ answer naming it) — that drive really is hygiene-specific.

## Where the org stands right now
- **Stage:** early. First pilot drive is complete; the org has pivoted from collecting physical donations to **raising cash and bulk-buying supplies**, then assembling kits as a group.
- **The bottleneck is money.** Everything is gated on funding the first bulk purchase (~$2/kit, working figure — treat as unconfirmed). Most active work right now is **fundraising/outreach, which happens off-repo** — so site work is currently maintenance, not the main push.
- **Fiscal sponsorship (in progress):** OLI is not a 501(c)(3). A revised fiscal-sponsorship MOU (tax-deductible route) was sent to Ms. Donley at CAM (cc Phillip Miller) ~a month ago — **no reply yet; a follow-up is pending.** The original (non-financial) partnership MOU is still in force in the meantime. Until the new one is signed, **do not describe donations as tax-deductible** anywhere on the site.
- **3v3 basketball tournament: SHELVED** (team capacity). Do not build or surface tournament pages.
- **Effectively a one-person operation right now** — other team members are on standby until there's money to assemble kits.

## Team (keep the site's team section matching this)
- **Prithivi Vijayakumar** — Founder
- **Saket Talap** — Director of Operations
- **Rishi Ramesh** — Director of Marketing
- **Jadon Santhosh** — Director of Finance & Development ("Overseeing OLI's financial operations and development strategy, ensuring every dollar is tracked and every funding opportunity is pursued.")

## The website — architecture
- **Domain:** `oneloveinitative.org` — note the spelling: **one "i" ("initative")**. This is intentional; it's the domain we own (correct spelling was taken years ago). **Never "correct" it.**
- **Hosting:** Cloudflare Workers. The Worker named `oneloveinitiative` serves the site and is connected to this GitHub repo.
- **Repo:** `github.com/privi-doughnut/oneloveinitiative`
- **Structure:** a **single `index.html`** with JS `showPage()` navigation (one-file site — all pages/sections live in that file).
- **AI chatbot ("OLI"):** calls a **separate** Cloudflare Worker named `oli-api-proxy`, which holds the Anthropic API key as a Cloudflare **secret** (`ANTHROPIC_API_KEY`). The site never contains the key. Source is tracked at `cloudflare-workers/oli-api-proxy.js` (config: `cloudflare-workers/wrangler.toml`) — it used to exist only in the Cloudflare dashboard. Deploy with `wrangler deploy --config cloudflare-workers/wrangler.toml`. The Worker restricts callers to an **Origin allowlist**, fixes the model/prompt/token cap server-side, and rate limits per IP (10/min, KV binding `RATE_LIMIT`).
- **Donations:** Stripe donate link (live) + Relay for banking.
- **Newsletter:** Google Sheets + Apps Script.

## Site design + content rules (Aug 2026 rebrand)
- **Monochrome only.** The palette is a grey ladder plus one warm paper tone (`--paper: #F4F2ED`). No hue anywhere — no colored hex, no saturated `rgb()`/`hsl()`. There is no purple left in the file.
- **No emoji as UI.** Numbered list markers come from a CSS `counter()`, not glyphs. The only symbols in the markup are `✓` and the `☰` nav toggle.
- **No custom cursor.** The cursor-follower effect was removed on purpose (it hurt nav responsiveness). Don't reintroduce it.
- **Grid hairlines:** cards draw their own four edges via `box-shadow`; the grid container has **no** border. This is deliberate — a container border outlines the empty tail of the last row and reads as a hole.
- **Fonts:** Fraunces (display) + Archivo (text), via Google Fonts. That request is the site's only third-party call besides Stripe/Apps Script/Instagram, and the Privacy Policy discloses it.
- **No analytics.** There is no GA4 (a commented-out snippet was removed). The Privacy Policy states this outright — if analytics are ever added, that page must change in the same commit.
- **Privacy Policy page** (`privacy-page`) exists and is linked in the footer.
- **QR code** on Get Involved is a self-hosted inline SVG data URI (generated with `segno`), not a third-party image fetch.
- **Language must match the funding pivot:** we raise cash and bulk-buy, we do not run item-collection drives. **Zero kits have been physically assembled as of Sep 2026.** The stat is now labeled **"Kits Funded"** (currently 50) rather than "Kits Packed" — it tracks funding coverage, not physical assembly. Never change the number or relabel it back to "packed/assembled/built" without an explicit founder-given figure — "funded" and "assembled" are different claims and must not be conflated.

## CRITICAL gotchas (read before editing)
1. **Model string:** the chatbot must use **`claude-sonnet-4-5`**. Do **NOT** use `claude-sonnet-4-20250514` — that string was the recurring bug that broke the chatbot. As of Aug 2026 this lives in the **Worker** (`cloudflare-workers/oli-api-proxy.js`), not `index.html`.
2. **The chatbot's system prompt lives in the Worker, not the site.** `index.html` sends only `messages`. If you change the persona or the org facts, edit `OLI_SYSTEM` in `cloudflare-workers/oli-api-proxy.js` and redeploy the Worker — editing `index.html` will do nothing.
3. **API key stays a Cloudflare secret** in `oli-api-proxy`. Never hardcode it into `index.html` or commit it. **This has already gone wrong once:** a live key was committed in `75380aa` (May 2026) and sat in the public repo's history for ~3 months. Set keys with `wrangler secret put ANTHROPIC_API_KEY --name oli-api-proxy` — never as a plaintext `[vars]` entry, never in a file.
4. **The admin panel is client-side.** Edits made in it do NOT reliably persist to the repo or the live site — they can be session-local. For anything that must go live, **edit `index.html` directly and push via git** (the Worker deploys from the repo). Don't trust the admin panel to have saved changes.
5. **Verify live changes in an incognito window** (no cached admin session) to confirm they actually deployed.
6. **Impact/stats numbers are founder-provided.** Use exactly the figures Prithivi gives you — do not generate, estimate, or infer metrics on your own.

## How to make a change
1. Edit `index.html` in this repo.
2. Commit + push to `main`.
3. The Cloudflare Worker auto-deploys from the repo.
4. Confirm in a private/incognito window.
5. Chatbot changes → check the `oli-api-proxy` Worker, keep the model string `claude-sonnet-4-5`.

## Open tasks
- **Follow up with Ms. Donley at CAM** on the fiscal-sponsorship MOU — still no reply. This is the gate on tax-deductible donations.
- Keep all tax-deductibility language **off** the site until the new MOU is signed. When it *is* signed, the places to update are: the "How to Give" page in `index.html`, the receipt footer in `email-templates/generate_thankyou.py` (then regenerate `thankyou.json`), and the tax rule in `OLI_SYSTEM` (the chatbot prompt).
- When the next drive is scheduled, fill in `countdown` in the `oli-data` JSON block (title + date + locations + posterUrl). The countdown section ships hidden and only appears for a future-dated drive — no need to clear it after the drive passes.

### Done (Sep 2026)
- Corrected a false "145 kits assembled/packed" figure sitewide (hero stat bar, impact stats, `oli-data`) to **0** — zero kits have actually been assembled. It was sitting directly above a live Stripe donate button. ✓
- Removed the "Our Progress" kit-count donation bar (145/20,000 = "0.7% of goal") entirely — JS, CSS, and the `kitCount` field it read from are all gone. Don't rebuild a kit-based progress bar until kits are actually being assembled; if a progress visual is wanted before then, it should track **funds raised toward a funding goal**, not a kit count, and needs a real goal dollar figure from the founder first. ✓
- Renamed "Our impact so far" → "Where we are now" since nothing has been distributed yet. ✓
- Fixed a layout bug: any `.section-title` with inline `text-align:center` renders off-center, because `.section-title { max-width: 20ch }` shrinks the box to content width with no `margin:auto`, so it hugs the container's left edge instead of centering. The `.instagram-section` and `.newsletter-inner` sections already had a `.section-title { max-width: none; }` override for this; `.impact-section` ("Where we are now") was missing it and got the same fix. **Check for this bug any time a new centered section heading is added.** ✓
- Relabeled the kits stat "Kits Packed" → "**Kits Funded**", value **50** (funding raised covers 50 kits worth — not the same claim as "assembled"). Changed in the hero stat bar, "By the Numbers" impact stat, and `oli-data` (`stats.kits`, `kitCount`). ✓
- Reworded general/org-level copy from "hygiene kits" to "**welfare kits**" (title tag, meta/OG/Twitter descriptions, hero eyebrow, Press "Our Story") — kept "hygiene kits" everywhere the text is specifically about the current "Children's Hygiene Kit Drive". See the "welfare kits vs hygiene kits" rule above. ✓

### Done (Aug 2026)
- Jadon Santhosh is in the team section and live. ✓
- "Drives Organized" reads **2** in all three places (stat block, impact counter, `oli-data`). ✓
- Tax-deductibility claims removed sitewide, including the chatbot prompt. ✓

## Quick reference
- Founder contact: prithivivijayakumar.work@gmail.com · 704-453-7198
- Partner: Crisis Assistance Ministry (fiscal sponsor pending; distribution partner now)
- CC setup note: being moved to Prithivi's own Mac account (fresh install) — authenticate with Claude Pro (Option 1); GitHub push needs a personal access token.
