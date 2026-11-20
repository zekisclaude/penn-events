# Penn Events: private MVP handoff (Nov 12, 2026)

Preview (private, owner-only): https://claude.ai/artifact/PWmhpLc7gmLMuXNwNL82se
Admin: open the same link and add `#admin`, or tap **Admin** in the header. Only the
artifact owner and invited Editors see it. Drafts, sources and the ingest log are
refused by the hosted database rules for everyone else, not just hidden in the UI.

## Student finder layout (Nov 13)
Calendar-style finder, built in `tools/gcal-finder.js` and `tools/gcal-finder.css` and spliced into
the build by `python3 tools/apply-gcal.py reference/index.v5-published.html site/index.html`.
- Week view (default on desktop): weekday headers with date numbers, today in a navy circle,
  hour gutter, category-colored event blocks laid out side by side when they overlap, and a red
  current-time line. Blocks without an end time get a dashed bottom edge, and their labels say
  the end time isn't listed. Clicking a block on desktop opens a quick-view popover; on phones
  it opens the event page.
- Schedule view (default on phones): agenda list with the date column on the left; each row shows
  every field the cards require.
- Sidebar (desktop): mini month with event dots and the visible week highlighted, class-year
  selector, color-coded interest toggles, search and reset.
- Toolbar: This week / Next week, arrows up to 8 weeks ahead, month title and view switcher.
  View, week and filters are remembered on the device (`pe.filters.v2`).
- Category colors: Finance navy, Consulting Penn red, Tech teal, Culture plum, Other graphite.
- No Google logo, typeface or color scheme is used.

## Where things live
- `site/index.html`: the published build (React 18 + Tailwind, shadcn-style components, lucide icons).
- Hosted database (one authoritative store, shared by student pages and admin):
  `events` (published, readable by anyone who can open the link),
  `review` (drafts, evidence, private notes, sources, change history; admin only),
  `sources` (source directory; admin only), `ingest` (processed-message log, hashed
  Message-IDs; admin only), `metrics` (anonymous pilot actions).
- `data/`: JSON export of every collection as of Nov 12, 2026.
- `reference/`: the deployed bundle before this session, plus readable copies of its logic and UI.
- `tests/`: Playwright acceptance suite (126 checks) and a test double of the hosting runtime.

## Display rules
- Weeks are Monday–Sunday in America/New_York, so they follow daylight-saving changes.
- An event with an end time leaves the upcoming list when it ends. An event without one
  stays through its scheduled local date and leaves at local midnight. No end time is shown
  or invented.
- Canceled and postponed events never appear in the upcoming list. Their detail URLs keep working.
- Ended events keep their detail URLs, marked "This event has ended."
- RSVP deadlines within 48 hours are shown in red with a countdown.
- An RSVP button appears only with a valid http(s) link, open or unknown status, a deadline
  that hasn't passed, a scheduled status, and an event that hasn't ended.
- Demo fixtures are dated relative to today so they stay testable. Demo records are flagged
  `isDemo` and are fictional. Delete all `demo-*` records before launch.

## Adding and correcting events through chat
1. Paste the announcement, caption, screenshot or link into chat, along with the source and capture time.
2. Claude extracts records in the import format (below) and either writes them as drafts into
   `review` or gives you JSON to paste into **Admin → Add announcement → Import JSON**.
3. Review in **Admin → Review queue**. Approve only when every "Must fix" item is resolved.
4. To correct a published event, use **Admin → Published → (event) → Save correction**.
   The ID and URL stay the same.
5. When a later announcement changes something, import it. The duplicate check will flag it.
   Use "Compare as correction" to apply only the fields that changed. Earlier sources stay attached.

## Import format (one item per event or session)
{ "source": {"kind": "email|instagram|paste|upload|calendar|chat|json", "label": "...",
  "messageId": "<...>", "capturedAt": "ISO time", "excerpt": "...", "isPublic": false, "url": null},
  "event": {"title", "organizer", "description", "categories": ["finance","consulting","tech","culture","other"],
   "startLocal": "YYYY-MM-DDTHH:mm" (Philadelphia) | null, "endLocal": ... | null,
   "location", "online", "onlineUrl", "eligibleYears": ["first-year","sophomore","junior","senior"],
   "eligibilityStatus": "confirmed|unconfirmed", "restrictions": {"school","membership","application","invitationOnly","other"},
   "jobEligibility", "registration": "required|optional|none|unconfirmed", "registrationStatus": "open|closed|unknown",
   "rsvpUrl", "rsvpDeadlineLocal", "rsvpInstructions", "status": "scheduled|canceled|postponed", "statusNote",
   "announcementUrl", "sourceLabel"},
  "evidence": {"field": "exact quote"}, "flags": ["..."] }
Rules: never guess eligibility, dates, years, deadlines, locations, or whether registration is open.
Leave unknown values null or unconfirmed and add a flag.

## Weekly operating checklist
1. Collect. Check the dedicated inbox once it exists, the Instagram account, and the public
   calendars (Career Services, University Life, the cultural centers, Wharton CampusGroups).
   Mark each source checked in **Admin → Sources**.
2. Import. Paste or upload each new announcement, or send it to Claude in chat. Repeats are
   skipped by Message-ID or content hash.
3. Review. Clear the queue. Use **Needs clarification** for anything you can't confirm, and
   confirm member-only or private-channel items are appropriate to list.
4. Publish. Approve, then open the student page to check the card reads correctly.
5. Update. Re-check events in the next 7 days for cancellations or room changes. Apply
   corrections in place.
6. Measure. Review **Admin → Pilot activity**, excluding owner, editor and demo traffic.

## Recurring collection
Not enabled. No scheduled task exists. A suggested cadence, pending your approval: weekdays at
8:40 AM and 4:40 PM ET for the inbox and calendars, plus a daily pass over Instagram stories.

## Vercel deployment (Nov 19)
- Project `penn-events` on the zekisclaude-8572 Vercel team: https://penn-events-zekisclaude-8572.vercel.app
- Vercel Authentication is set to protect all deployments, so only signed-in members of that Vercel team can open it. Turn it off in Project Settings → Deployment Protection only when you approve the public launch.
- Admin: open `/#admin` and sign in with the password stored as the `ADMIN_PASSWORD` environment variable (sensitive, Production and Preview). The session is a signed, HttpOnly cookie set from `SESSION_SECRET`.
- Data: private Vercel Blob store `penn-events-data`, one JSON document per record. The first request seeds it from `vercel/seed/` (create-if-absent, so it never overwrites edits).
- Rules enforced on the server (`vercel/api/db.js`): anyone reads `events`; anyone can create a validated metric; only admin reads or writes `review`, `sources`, `ingest`, `metrics`.
- AI extraction: set `ANTHROPIC_API_KEY` (and optionally `EXTRACT_MODEL`) in Vercel to turn on the paste/flyer extraction buttons. Without it, JSON import and chat-assisted import still work.
- Redeploy: `python3 tools/vercel-deploy.py`. Local test: `node tests/vercel-e2e.mjs` (36 checks against the real handlers and a local file store).
- Not in git: `vercel/seed/` and `data/live-export/` hold drafts and source excerpts.

## Update Nov 18: categories, placeholders, demos removed
- Twelve interest categories: Finance, Consulting, Tech, Entrepreneurship, Healthcare, Career, Academic, Culture, Social, Arts, Service, Other (colors in `tools/gcal-finder.js`, labels in `tools/apply-gcal.py`).
- Events with no announced date are published and listed under **Date to be announced** (shown below the calendar in both views, filters apply). Unknown location, eligibility and registration use the plain placeholder wording already on the cards ("Location to be announced", "Eligibility not confirmed", "Registration details unconfirmed"). Dates known without a time are written into the description.
- Possibly-private Instagram posts are published with the note "May be limited to the organization's members. Check with the organizer."
- Demo records are gone from the database, the seed and the repo's `data/`. Test-only fixtures live in `tests/fixtures/` and are never deployed.
- `python3 -I tools/build-content.py data/live-export vercel/seed` rebuilds the seed (re-categorize, publish with placeholders, reject past drafts). The live store applies `vercel/seed/manifest.json` on the next request; records an admin has edited are never overwritten.
- Build order: `tools/apply-gcal.py` then `tools/build-vercel.py` then `python3 tools/vercel-deploy.py`.

## Update Nov 20: eligibility rule and design
- Eligibility the organizer did not state is now treated as open to all undergraduates: it appears under every class-year filter and is labeled "Open to all (not specified)." The stored record keeps `eligibilityStatus: "unconfirmed"`, so the data stays honest and the rule can be changed in `tools/apply-gcal.py` (`Oh` and `Wo`).
- Design: rounded cards on a light blue-gray page, navy date tiles (red for today), pill controls and colored category pills. Styles are in `tools/theme.css`.
