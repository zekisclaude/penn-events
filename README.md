# Penn Events

Independent student project. Not affiliated with the University of Pennsylvania.

Mobile-first finder for Penn recruiting, career and cultural events, with a private admin review desk.

- `site/index.html`: the built page (React, Tailwind, shadcn-style components).
- `tools/`: calendar-style finder source (`gcal-finder.js`, `gcal-finder.css`, `gcal-theme.css`), `apply-gcal.py` (splices it into the build), `prep_import.py` (cleans extraction files for import).
- `tests/`: Playwright acceptance suite (`acceptance.mjs`, `calendar.mjs`, `import-batches.mjs`) with a test double of the hosting runtime.
- `data/events`, `data/sources`: published events and the source directory. Drafts, source excerpts and analytics are not committed.
- `docs/HANDOFF.md`: operating notes and the import format.

Published events live in the hosting database, not in this repo; `data/events` is an export.
