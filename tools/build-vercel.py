"""Build vercel/public/index.html from site/index.html (run tools/apply-gcal.py first).
Swaps the Claude-hosted runtime for /runtime.js, uses this site's own address for share links, and drops the embedded snapshot."""
import pathlib
root = pathlib.Path(__file__).parent.parent
s = (root / 'site/index.html').read_text()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:60], s.count(a)); s = s.replace(a, b)
rep('dg="https://claude.ai/artifact/PWmhpLc7gmLMuXNwNL82se"', 'dg=location.origin+"/"')
i = s.index('Ph="2026-11-12T21:38:07.533Z",zh=['); j = s.index(',Th={generatedAt:Ph,events:zh}')
s = s[:i] + 'Ph="1970-01-01T00:00:00.000Z",zh=[]' + s[j:]
rep('<script type="module" crossorigin>', '<script src="/runtime.js"></script>\n<script type="module" crossorigin>')
rep('children:l.isAdmin&&o.jsx("a",{href:"#admin",', 'children:l.isAdmin&&[o.jsx("a",{key:"a",href:"#admin",')
rep('"hover:bg-white/10"}`,children:"Admin"})', '"hover:bg-white/10"}`,children:"Admin"}),o.jsx("button",{key:"b",type:"button",onClick:()=>window.peSignOut&&window.peSignOut(),className:"inline-flex min-h-[44px] items-center rounded px-2.5 hover:bg-white/10",style:{background:"transparent",border:0,color:"inherit",font:"inherit",cursor:"pointer"},children:"Sign out"})]')
(root / 'vercel/public/index.html').write_text(s); print('vercel page', len(s))
