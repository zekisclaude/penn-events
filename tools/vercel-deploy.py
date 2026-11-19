"""Deploy ./vercel to the penn-events Vercel project (production). Needs the Vercel API token injected by the environment.
Usage: python3 tools/vercel-deploy.py"""
import hashlib, json, os, subprocess, sys, time
PROJECT = 'prj_t7N2NZL23aDKaDJpbcHVzCHwv43g'
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'vercel'))
SKIP = ('node_modules', '.localdb', '.vercel')
files = []
for root, _, fs in os.walk('.'):
    if any(x in root for x in SKIP): continue
    for f in fs:
        p = os.path.join(root, f)[2:]
        if p in ('seed.mjs', 'dev-server.mjs', 'package-lock.json') or p.endswith('.gitignore'): continue
        files.append(p)
entries = []
for p in sorted(files):
    b = open(p, 'rb').read(); sha = hashlib.sha1(b).hexdigest()
    subprocess.run(['curl', '-sS', '-m', '60', '-o', '/dev/null', '-X', 'POST', 'https://api.vercel.com/v2/files', '-H', 'Content-Type: application/octet-stream', '-H', f'x-vercel-digest: {sha}', '--data-binary', f'@{p}'], check=True)
    entries.append({'file': p, 'sha': sha, 'size': len(b)})
body = {'name': 'penn-events', 'project': PROJECT, 'target': 'production', 'files': entries, 'projectSettings': {'framework': None, 'outputDirectory': 'public', 'nodeVersion': '22.x'}}
r = subprocess.run(['curl', '-sS', '-m', '120', '-X', 'POST', 'https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1', '-H', 'Content-Type: application/json', '-d', json.dumps(body)], capture_output=True, text=True)
d = json.loads(r.stdout); print(d.get('id'), d.get('url'), d.get('error'))
for _ in range(30):
    s = json.loads(subprocess.run(['curl', '-sS', '-m', '20', f"https://api.vercel.com/v13/deployments/{d['id']}"], capture_output=True, text=True).stdout)
    print(s.get('readyState'), s.get('errorMessage') or '')
    if s.get('readyState') in ('READY', 'ERROR', 'CANCELED'): break
    time.sleep(8)
sys.exit(0 if s.get('readyState') == 'READY' else 1)
