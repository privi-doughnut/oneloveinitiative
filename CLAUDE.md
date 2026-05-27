# One Love Initiative — Claude Code Briefing

## Who We Are

**One Love Initiative (OLI)** is a student-led nonprofit based in Charlotte, NC, founded in 2025 by Prithivi Vijayakumar. Our mission is to mobilize students to assemble and distribute O.L.I Kits — bundles of essential supplies — for individuals and families experiencing hardship across the Charlotte community.

**The Team:**
- Prithivi Vijayakumar — Founder
- Saket Talap — Director of Operations
- Rishi Ramesh — Marketing & Outreach Head

**Contact:**
- Email: oneloveinitiative.official@gmail.com
- Instagram: @one.love.initiative
- Website: https://oneloveinitative.org

---

## Current Drive

**Children's Hygiene Kit Drive** — our pilot drive, currently active.

Each O.L.I Kit contains:
- Kids Toothbrush
- Kids Toothpaste
- Kid-Friendly Soap or Body Wash
- Kid-Friendly Lotion

**Kit Goal:** 20,000 O.L.I Kits by end of summer 2025.

---

## Upcoming Drives (In Planning)

- **Hindu Center of Charlotte** — partnership drive in progress, no confirmed date yet
- **Public location drive** — brainstorming a high-foot-traffic public location (e.g. shopping area), no date yet
- **Retail partnerships** — actively pursuing Harris Teeter, Walmart, Target as potential drive partners

---

## Partnerships

### Crisis Assistance Ministry (CAM)
- **Primary distribution partner** — all donated kits are delivered to CAM for distribution to families
- **Fiscal sponsor** — CAM holds donations made through their system earmarked for OLI, enabling tax deductions for donors
- **Signed MOU** dated March 18, 2026, signed by Phillip A. Miller (Director of Volunteer Philanthropy) for CAM and Prithivi Vijayakumar for OLI
- A new **Fiscal Sponsorship MOU** has been drafted (see below) to expand the relationship and give OLI more operational freedom. It has not yet been signed — it will be presented to CAM after OLI's first drive.

### Hindu Center of Charlotte
- Community partner helping expand volunteer base
- Future drive planned there

### Future Partnerships Being Pursued
- Harris Teeter, Walmart, Target (retail donation drive hosts)
- Local businesses and schools across Charlotte

---

## Fiscal Sponsorship Agreement (Draft — Not Yet Signed)

Key terms of the drafted Fiscal Sponsorship MOU with CAM:

1. **CAM as fiscal sponsor** — donors can give to CAM earmarked for OLI and receive tax deductions under CAM's 501(c)(3) status
2. **OLI retains full spending discretion** — no prior CAM approval needed for individual expenses
3. **Quarterly financial reporting** — OLI submits expense reports with receipts to CAM within 30 days after each quarter
4. **OLI operational independence** — OLI controls its own branding, staffing, programming, partnerships, and communications
5. **OLI can partner with anyone** — no restriction on simultaneous partnerships with other orgs, businesses, or schools
6. **Direct distribution** — routine small-scale direct outreach is allowed; major direct distribution events require CAM written approval first
7. **Intellectual property** — OLI owns all its own branding, logo, website, and content; neither party uses the other's brand without written consent
8. **Liability** — each party is solely responsible for its own actions; no shared liability
9. **Conflict resolution** — written notice → 60 days good faith discussion → either party may exit with 60 days written notice
10. **Annual renewal** — agreement renews yearly; 60 days notice required to exit

---

## Tech Stack

### Website
- **Single file:** `index.html` — all HTML, CSS, and JavaScript in one file
- **No framework, no build step** — pure HTML/CSS/JS only
- **Multi-page navigation:** JavaScript `showPage()` function shows/hides page divs — do NOT use actual page routing
- **Favicon:** `OLI_LOGO.jpg` in root of repo
- **Font:** Montserrat (Google Fonts)
- **Color scheme:** `--purple: #7B5CF5`, `--black: #080808`, `--white: #F5F5F0`

### Hosting & Deployment
- **Cloudflare Workers** — site is deployed as a Worker
- **Custom domain:** `oneloveinitative.org` (note: one 'i' — this is the correct spelling of the domain we own)
- **Workers.dev URL:** `oneloveinitiative.its-the-prithivi-show.workers.dev`
- **GitHub repo:** `github.com/privi-doughnut/oneloveinitiative`
- Pushing to GitHub main branch auto-deploys via Cloudflare

### OLI AI Chatbot
- Named **OLI**, embedded as a floating chat widget in the bottom-right corner of the site
- Powered by `claude-sonnet-4-5`
- **Proxy URL:** `https://oli-api-proxy.its-the-prithivi-show.workers.dev`
- The proxy is a separate standalone Cloudflare Worker named `oli-api-proxy`
- API key stored as `ANTHROPIC_API_KEY` secret on the `oli-api-proxy` Worker
- The chatbot fetch call in `index.html` goes to the proxy URL, NOT directly to Anthropic
- OLI input is a `<textarea>` — Enter sends, Shift+Enter for new line

### Integrations
- **Donations:** Stripe — https://donate.stripe.com/3cIcMY53Y81g7MK0hl0kE00
- **Banking:** Relay
- **Newsletter subscribers:** Google Sheets via Apps Script
  - Apps Script URL: `https://script.google.com/macros/s/AKfycbzJG_GSUYcRHz70pTjTyvOuUFQ2MksPO8gGtwL62SKa_08fuDwgO03EA3NIZwoDCfU3lg/exec`
  - Sheet: https://docs.google.com/spreadsheets/d/1WvcBt5fhCb7EpO-vg1X8YAcAHv8o2l0Q3eJBJL8xMuw/
- **Tracking/planning doc:** https://excel.cloud.microsoft/open/onedrive/?docId=792C866DCF2FAD68%21s25744e75e56446c1a46142ecfa29d40c&driveId=792C866DCF2FAD68

---

## Admin Panel

**Access:** `oneloveinitative.org/admin` or via footer link
**Password:** `[redacted — ask Claude]`

### What it should do:
- Password-protected entry page
- Full visual editor for the site — click any text to edit it
- Ability to add/remove/edit team members
- Update kit counts and stats bar numbers
- Add drive dates, locations, and descriptions
- Upload photos to the gallery section
- Add/remove testimonials
- Ctrl+Z undo support
- Version history — ability to revert to previous versions
- "Publish" button — commits and pushes changes to GitHub so they go live
- Section builder — drag and drop to add new sections and elements
- Multimedia support — upload images and videos

### Implementation notes:
- Admin page should be a separate section of index.html or a separate admin.html
- Changes should write back to index.html and push to GitHub via the GitHub API or git
- Keep admin link subtle in the footer so casual visitors don't notice it

---

## Social Media Strategy

When helping with social media content, optimize for:
- **High views:** Hook in first 2 seconds, trending audio on Reels
- **Likes & saves:** Emotional storytelling, before/after, "save this for later" CTAs
- **Shares & reposts:** Relatable content, community pride, Charlotte-specific
- **Viewer retention:** Short punchy captions, visual variety, clear narrative arc
- **Content pillars:** Behind the scenes of drives, kit assembly, team spotlights, impact stats, donor shoutouts, community stories

Platform focus: Instagram Reels and TikTok. Cross-post everything.

---

## Donation Page / Tax Deduction Info

A dedicated page on the site should explain:
- OLI's current financial/legal status (student-led initiative, not yet a standalone 501(c)(3))
- How donors CAN get a tax deduction by donating through CAM earmarked for OLI
- Step-by-step instructions for donating through CAM
- Link to CAM's donation page with instructions to note "One Love Initiative" in the designation field
- OLI's direct Stripe donation link (no tax deduction, but goes straight to OLI)
- Transparency statement about how funds are used

---

## Key Rules for Editing the Site

1. **Never break the OLI chatbot** — the fetch call must always point to `https://oli-api-proxy.its-the-prithivi-show.workers.dev`, never directly to `https://api.anthropic.com`
2. **Always use `claude-sonnet-4-5`** as the model in the OLI chatbot — never `claude-sonnet-4-20250514` or any other string
3. **Never add a wrangler.toml** unless explicitly asked — it has caused deployment issues in the past
4. **Never add a worker.js** to the repo unless explicitly asked
5. **Domain spelling:** The correct domain is `oneloveinitative.org` (one 'i') — do not use `oneloveinitiative.org` (two 'i's) which is owned by someone else
6. **Page navigation:** Always use `showPage('pagename')` — never use href links for internal navigation
7. **Mobile nav:** The hamburger menu must auto-close when navigating to a new page — `document.querySelector('.nav-links').classList.remove('mobile-open')` is called at the start of `showPage()`
8. **After any changes:** Always commit and push to GitHub so Cloudflare auto-deploys

---

## Git Workflow

- Remote: `https://github.com/privi-doughnut/oneloveinitiative.git`
- Default branch: `main`
- Always commit with clear messages describing what changed
- Always push after committing so changes go live on Cloudflare
