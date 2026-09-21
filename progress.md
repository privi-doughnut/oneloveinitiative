# Progress Log — One Love Initiative site

Running notes between Claude Code sessions. See `CLAUDE.md` for the durable project briefing; this file is just "what happened last time / what's next."

## 2026-09-21 session
- Founder flagged that "145 kits assembled" was showing above the live Stripe donate button while zero kits have actually been assembled. Fixed sitewide: hero stat bar and "By the Numbers" now show 0; removed the "Our Progress" donation bar (JS + CSS + the `kitCount` field) that computed "0.7% of 20,000-kit goal" from the false number; renamed "Our impact so far" -> "Where we are now". Committed `42ed7c7`, pushed, verified live.
- Swept the whole site with Claude in Chrome (every page, full scroll) looking for small visual bugs. Found one real one: the "Where we are now" heading was rendering left-flush instead of centered. Root cause: `.section-title` has `max-width:20ch` with no `margin:auto`, so a centered instance still hugs the container's left edge. `.instagram-section`/`.newsletter-inner` already had a `max-width:none` override for this; `.impact-section` didn't. Added it — verified visually via a live style injection before committing.
- Founder update: 50 kits funded (money raised covers 50 kits worth, none physically assembled yet). Renamed the "Kits Packed" stat to "Kits Funded" = 50 in the hero bar, impact stat, and `oli-data`.
- Founder clarified OLI's kits aren't hygiene-only long-term ("Our Work" already says future drives go "beyond hygiene"). Reworded general/org-level copy from "hygiene kits" to "welfare kits" (title tag, meta/OG/Twitter descriptions, hero eyebrow, Press "Our Story"). Left "hygiene kits" intact anywhere the text is specifically about the current "Children's Hygiene Kit Drive" (that drive really is hygiene-specific).
- All three fixes committed together (`8aff217`), pushed, deploy verified live.

## 2026-09-16 session
- Found the Aug 25 monochrome rebrand + bug-sweep commit (`3bdf76f`) had been sitting **committed but unpushed** for ~3 weeks — the live site was still on the old purple design. Pushed it; Cloudflare Worker auto-deployed; verified live.
- Founder gave updated figures: **145 kits packed, 15 volunteers**. Updated all 5 spots in `index.html` (hero stat block, impact counters, press fact-row, `oli-data` JSON) and dropped "Active" from the volunteer label per founder's wording. Committed (`b8eb176`) and pushed; verified live.
- Updated the "45 kits" reference in `CLAUDE.md` to 145.

## Current state
- Live site matches repo (`https://oneloveinitative.org/`, one "i" spelling).
- Stats live: 50 kits funded, 15 volunteers, 2 drives, 1 partner, 20,000 kit goal. Zero kits physically assembled.
- Admin panel (`/admin.html`) still exists but is client-side only and already drifted from the site's current wording (its labels still say "Kits Distributed"/"Kits Collected") — don't trust it for anything that must go live; edit `index.html` directly (see `CLAUDE.md` gotcha #4).

## Next session — open items
- **CAM fiscal-sponsorship MOU** — still no reply from Ms. Donley. Off-repo, founder's action. Keep tax-deductibility language off the site until it's signed.
- **Drive countdown** — ships hidden in `oli-data`. When the next drive is scheduled, fill in title/date/locations/posterUrl.
- `admin.html`'s stat labels/wording have drifted from `index.html` (still says "Kits Distributed" etc.) — not urgent since it's not the source of truth, but worth a pass if the admin panel is ever relied on again.
- No other known bugs or pending code work as of this session.
