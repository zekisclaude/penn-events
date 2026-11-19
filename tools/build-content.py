"""Build the production seed from an export of the live database.

 - drops every demo record (events, drafts, and their import-log entries)
 - assigns the twelve categories from title/organizer/description keywords
 - publishes held drafts that have not happened yet, using placeholders for anything unknown
 - rejects held drafts whose date has already passed
Usage: python3 -I tools/build-content.py data/live-export vercel/seed [--today YYYY-MM-DD]
"""
import json, re, sys, shutil, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo('America/New_York')
src, out = Path(sys.argv[1]), Path(sys.argv[2])
today = datetime.datetime.now(TZ).date()
if '--today' in sys.argv: today = datetime.date.fromisoformat(sys.argv[sys.argv.index('--today') + 1])
now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

RULES = [  # (category, keywords) in display order
    ('finance', r'financ|invest|banking|bank of america|actuar|accounting|trading|private equity|real estate|big four|wall street'),
    ('consulting', r'consult'),
    ('tech', r'hackathon|pennapps|software|computer|engineering|\bai\b|machine learning|coding'),
    ('entrepreneurship', r'entrepreneur|venture|founder|startup|start-up|ngen|innovation'),
    ('healthcare', r'health|kidney|medical|medicine|pre-?med'),
    ('career', r'career|recruit|internship|networking|info session|alumni|panel|fireside|big four'),
    ('academic', r'research|studies|disciplines|economics|journal|lecture|dialogue|policy|councilmember|speaker event|conversation with|talk\b|office hours|dean'),
    ('arts', r'dance|masterclass|screening|film|performance|cultural show|funk|barrio|concert|theat|music|karaoke'),
    ('social', r'potluck|brunch|mixer|happy hour|formal|snacks|bake-?off|friendsgiving|karaoke|gbm|general body|social|dinner|shabbat|giveaway|pokemon|card game|trek'),
    ('service', r'volunteer|tutoring|fundrais|bake sale|care package|love your park|service|community'),
    ('culture', r'asian|african|chinese|vietnamese|philippine|hillel|black|umoja|latin|arab|korea|jewish|international|pasa|csa|identity|heritage|africana|anime|tijori'),
]
KNOWN = [c for c, _ in RULES] + ['other']


def categories(e):
    text = ' '.join([e.get('title', ''), e.get('organizer', ''), e.get('description', '')]).lower()
    cats = [c for c, rx in RULES if re.search(rx, text)]
    # culture is the audience, not the activity: keep it only when nothing more specific matched or the org itself is cultural
    if len(cats) > 1 and 'culture' in cats and re.search(r'asian|african|chinese|vietnamese|philippine|hillel|black|umoja|korea', e.get('organizer', '').lower()) is None:
        cats.remove('culture')
    return (cats[:3] or ['other'])


def load(coll):
    d = {}
    for f in sorted((src / coll).glob('*.json')):
        raw = json.loads(f.read_text()); d[f.stem] = raw.get('data', raw) if 'version' in raw else raw
    return d


def start_date(draft, flags):
    s = draft.get('start')
    if s:
        return datetime.datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone(TZ).date(), True
    for f in flags:
        m = re.search(r'Date (?:stated|inferred)[^0-9]*\((\d{4}-\d{2}-\d{2})\)', f)
        if m: return datetime.date.fromisoformat(m.group(1)), False
    return None, False


events, review, sources, ingest = load('events'), load('review'), load('sources'), load('ingest')
demo_ev = {i for i, e in events.items() if e.get('isDemo') or i.startswith('demo-')}
demo_rv = {i for i, r in review.items() if r.get('isDemo') or i.startswith('demo-')}
demo_ing = {k for k, v in ingest.items() if set(v.get('reviewIds', [])) <= demo_rv and v.get('reviewIds')}
for i in demo_ev: events.pop(i)
for i in demo_rv: review.pop(i)
for k in demo_ing: ingest.pop(k)

report = {'published': [], 'rejected_past': [], 'left_draft': [], 'recategorized': 0}
for rid, r in review.items():
    d = r['draft']; flags = r.get('flags', [])
    d['categories'] = categories(d)
    if r['reviewStatus'] == 'approved':
        events[rid]['categories'] = d['categories']; report['recategorized'] += 1; continue
    if r['reviewStatus'] != 'draft': continue
    when, exact = start_date(d, flags)
    if when and when < today:
        r['reviewStatus'] = 'rejected'
        r['history'].append({'at': now_iso, 'action': 'Marked rejected', 'note': f'Event date {when} has already passed.'})
        report['rejected_past'].append(d['title']); continue
    # --- publish with placeholders for anything unknown
    if not (d.get('description') or '').strip():
        d['description'] = 'Details have not been announced yet.'
    if not exact and when:
        multi = next((m.group(1).strip() for x in flags for m in [re.match(r'Multi-day event ([^;]+?)(?:;|$)', x)] if m), None)
        has_date = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d{1,2}', d['description'].lower())
        if multi: d['description'] = (d['description'].rstrip() + f' Dates: {multi}. Times not announced.').strip()
        elif not has_date: d['description'] = (d['description'].rstrip() + f" Date: {when.strftime('%A, %B %-d, %Y')}. Time not announced.").strip()
    if any('private channel' in x.lower() for x in flags) and not (d['restrictions'].get('other') or '').strip():
        d['restrictions']['other'] = 'May be limited to the organization’s members. Check with the organizer.'
    if not d.get('rsvpUrl') and not (d.get('rsvpInstructions') or '').strip() and any("only 'in bio'" in x for x in flags):
        d['rsvpInstructions'] = 'The registration link is in the organizer’s Instagram bio.'
    d['updated'] = d['lastVerified'] = now_iso
    events[rid] = d
    r['reviewStatus'] = 'approved'; r['draft'] = d; r['updated'] = now_iso
    r['history'].append({'at': now_iso, 'action': 'Approved and published', 'note': 'Published with placeholders for unknown details.', 'fields': []})
    report['published'].append((d['title'], 'dated' if exact else ('date in text' if when else 'TBD')))

# every event must use only known categories
for e in events.values(): e['categories'] = [c for c in e.get('categories', []) if c in KNOWN] or ['other']

shutil.rmtree(out, ignore_errors=True)
for coll, docs in (('events', events), ('review', review), ('sources', sources), ('ingest', ingest)):
    (out / coll).mkdir(parents=True)
    for i, d in docs.items(): (out / coll / f'{i}.json').write_text(json.dumps(d, ensure_ascii=False))
manifest = {'version': 2, 'delete': [['events', i] for i in sorted(demo_ev)] + [['review', i] for i in sorted(demo_rv)] + [['ingest', k] for k in sorted(demo_ing)]}
(out / 'manifest.json').write_text(json.dumps(manifest))
print(f"events {len(events)}  drafts-left {sum(1 for r in review.values() if r['reviewStatus']=='draft')}  deleted demos {len(manifest['delete'])}")
print(f"published now: {len(report['published'])}  rejected as past: {len(report['rejected_past'])}  recategorized (already live): {report['recategorized']}")
for t, k in report['published']: print('  +', k.ljust(12), t[:70])
import collections
print(collections.Counter(c for e in events.values() for c in e['categories']))
