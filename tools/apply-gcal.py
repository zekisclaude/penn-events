"""Splice the calendar-style finder into the built page.
Usage: python3 tools/apply-gcal.py reference/index.v5-published.html site/index.html"""
import sys, pathlib
src, dst = sys.argv[1], sys.argv[2]
root = pathlib.Path(__file__).parent
s = open(src).read()
js = (root / 'gcal-finder.js').read_text()
css = (root / 'gcal-finder.css').read_text() + '\n' + (root / 'theme.css').read_text()
i = s.index('function Lg('); j = s.index('function Su(', i)
s = s[:i] + js + '\n' + s[j:]
def rep(a, b):
    global s
    assert s.count(a) == 1, (a, s.count(a)); s = s.replace(a, b)
# wider layout for the finder (event detail pages stay narrow)
rep('e.name==="admin"?"max-w-6xl":"max-w-3xl"', 'e.name==="event"?"max-w-3xl":"max-w-6xl"')
rep('"mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-1"', '"mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1"')
rep('className:"mx-auto max-w-3xl px-4 py-4 text-[13px] text-muted"', 'className:"mx-auto max-w-6xl px-4 py-4 text-[13px] text-muted"')
rep('family=IBM+Plex+Sans:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap', 'family=Hanken+Grotesk:wght@400;500;600;700&display=swap')
rep('pi=["finance","consulting","tech","culture","other"],Ql={finance:"Finance",consulting:"Consulting",tech:"Tech",culture:"Culture",other:"Other"}',
    'pi=["finance","consulting","tech","entrepreneurship","healthcare","career","academic","culture","social","arts","service","other"],Ql={finance:"Finance",consulting:"Consulting",tech:"Tech",entrepreneurship:"Entrepreneurship",healthcare:"Healthcare",career:"Career",academic:"Academic",culture:"Culture",social:"Social",arts:"Arts",service:"Service",other:"Other"}')
rep('subset of ["finance","consulting","tech","culture","other"]', 'subset of ["finance","consulting","tech","entrepreneurship","healthcare","career","academic","culture","social","arts","service","other"]')
# an event with no announced date can be published; it appears under "Date to be announced"
rep('!e.start&&e.status!=="postponed"&&t.push({text:"Start date and time are missing.",blocking:!0})','!e.start&&e.status!=="postponed"&&t.push({text:"Start date and time are missing. The event will be listed under \'Date to be announced\'.",blocking:!1})')
# Eligibility the organizer did not state is treated as open to all undergraduates, and labeled as assumed.
rep('function Oh(e,t){return t==="all"?!0:e.eligibilityStatus==="confirmed"&&e.eligibleYears.includes(t)}',
    'function Oh(e,t){return t==="all"?!0:e.eligibilityStatus!=="confirmed"||e.eligibleYears.length===0?!0:e.eligibleYears.includes(t)}')
rep('function Wo(e){if(e.eligibilityStatus!=="confirmed"||e.eligibleYears.length===0)return"Eligibility not confirmed.";',
    'function Wo(e){if(e.eligibilityStatus!=="confirmed"||e.eligibleYears.length===0)return e.restrictions.membership?"Members only.":e.restrictions.school?.trim()?`${e.restrictions.school.trim()} students. Other eligibility not specified.`:"Open to all (not specified).";')
rep('The announcement does not say who may attend. Check with the organizer before going.', 'The organizer did not say who may attend, so this is listed as open to all. Check with the organizer before going.')
rep('Eligibility is not confirmed. The event will only appear under All and will be labeled.', 'Eligibility is not specified. The event will be listed as open to all, with a note that the organizer did not say.')
rep('</head>', '<style id="pe-gc">' + css + '</style>\n</head>')
open(dst, 'w').write(s)
print('ok', len(s))
