# Progress Log — One Love Initiative site

Running notes between Claude Code sessions. See `CLAUDE.md` for the durable project briefing; this file is just "what happened last time / what's next."

## 2026-09-16 session
- Found the Aug 25 monochrome rebrand + bug-sweep commit (`3bdf76f`) had been sitting **committed but unpushed** for ~3 weeks — the live site was still on the old purple design. Pushed it; Cloudflare Worker auto-deployed; verified live.
- Founder gave updated figures: **145 kits packed, 15 volunteers**. Updated all 5 spots in `index.html` (hero stat block, impact counters, press fact-row, `oli-data` JSON) and dropped "Active" from the volunteer label per founder's wording. Committed (`b8eb176`) and pushed; verified live.
- Updated the "45 kits" reference in `CLAUDE.md` to 145.
- Repo is clean, `main` is even with `origin/main`, nothing uncommitted.

## Current state
- Live site matches repo (`https://oneloveinitative.org/`, one "i" spelling).
- Stats live: 145 kits packed, 15 volunteers, 2 drives, 20,000 kit goal.
- Admin panel (`/admin.html`) still exists but is client-side only — don't trust it for anything that must go live; edit `index.html` directly (see `CLAUDE.md` gotcha #4).

## Next session — open items
- **CAM fiscal-sponsorship MOU** — still no reply from Ms. Donley. Off-repo, founder's action. Keep tax-deductibility language off the site until it's signed.
- **Drive countdown** — ships hidden in `oli-data`. When the next drive is scheduled, fill in title/date/locations/posterUrl.
- No other known bugs or pending code work as of this session.
