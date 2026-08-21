# CLAUDE.md — One Love Initiative

Project briefing for Claude Code. Last updated: Aug 2026.

## What this is
The **One Love Initiative (OLI)** is a student-led nonprofit in Charlotte, NC that assembles hygiene kits (toothbrush, toothpaste, soap, lotion) for individuals and families experiencing hardship. Model: buy supplies in bulk → volunteers assemble standardized "OLI Kits" → distributed through our partner, **Crisis Assistance Ministry (CAM)**. Founder: **Prithivi Vijayakumar**. This repo is the OLI website.

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

### Done (Aug 2026)
- Jadon Santhosh is in the team section and live. ✓
- "Drives Organized" reads **2** in all three places (stat block, impact counter, `oli-data`). ✓
- Tax-deductibility claims removed sitewide, including the chatbot prompt. ✓

## Quick reference
- Founder contact: prithivivijayakumar.work@gmail.com · 704-453-7198
- Partner: Crisis Assistance Ministry (fiscal sponsor pending; distribution partner now)
- CC setup note: being moved to Prithivi's own Mac account (fresh install) — authenticate with Claude Pro (Option 1); GitHub push needs a personal access token.
