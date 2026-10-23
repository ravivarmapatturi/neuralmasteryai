"""Score every Learn page against the linear-regression page's standard.

The standard, measured: enough prose to actually explain (words), visuals
that serve the prose rather than replace it (words per embedded component),
no dark-mode widgets on the cream notebook theme, no gamified filler
("Masterclass", "HUD", XP), and the teaching beats a page needs (code,
a limits / when-not-to-use section). Writes a CSV and prints a summary.

  python3 scripts/audit/content-audit.py [out.csv]
"""
import csv, os, re, sys

ROOT = 'src/content/docs'
VIZ = 'src/viz'
HEX = re.compile(r"(?:background(?:Color)?|fill|bg)[^\n]{0,40}?#([0-9a-f]{6}|[0-9a-f]{3})\b", re.I)
TW_DARK = re.compile(r"\bbg-(slate|gray|zinc|neutral|stone)-(8|9)(00|50)\b")

def luminance(h):
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
SLOP = re.compile(r"masterclass|laboratory|\bHUD\b|\bXP\b|in 60 seconds|you are the llm|level up|unlock|supercharge|deep dive into|ultimate guide|🚀|✨|🔥|💡|🎯", re.I)
LIMITS = re.compile(r"^#{2,3} .*(when \*?not|limitation|limits|pitfall|failure|where it (breaks|fails|stops)|caveat|trade-?off)", re.I | re.M)

dark_cache = {}
def is_dark(path):
    if path not in dark_cache:
        try:
            src = open(path, encoding='utf-8').read()
            # Dark surfaces: backgrounds/fills set to a near-black colour,
            # which clash with the cream notebook theme in light mode.
            dark_cache[path] = sum(luminance(h) < 0.12 for h in HEX.findall(src)) + len(TW_DARK.findall(src))
        except OSError:
            dark_cache[path] = 0
    return dark_cache[path]

def resolve(mdx, spec):
    base = os.path.normpath(os.path.join(os.path.dirname(mdx), spec))
    for ext in ('.tsx', '.ts', '.jsx', '/index.tsx'):
        if os.path.exists(base + ext):
            return base + ext
    return None

rows = []
for dirpath, _, files in os.walk(ROOT):
    for f in files:
        if not f.endswith('.mdx'):
            continue
        p = os.path.join(dirpath, f)
        src = open(p, encoding='utf-8').read()
        body = re.sub(r'^---.*?---', '', src, count=1, flags=re.S)
        imports = re.findall(r"^import\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]", body, re.M)
        comps = {name: resolve(p, spec) for name, spec in imports}
        used = [n for n in comps if re.search(r'<' + n + r'\b', body)]
        prose = re.sub(r'```.*?```', ' ', body, flags=re.S)
        prose = re.sub(r'^import .*$', ' ', prose, flags=re.M)
        prose = re.sub(r'<[^>]*>', ' ', prose)
        prose = re.sub(r'\$\$.*?\$\$', ' ', prose, flags=re.S)
        words = len(re.findall(r"[A-Za-z][A-Za-z'-]+", prose))
        dark = [n for n in used if comps[n] and is_dark(comps[n]) >= 3]
        slop = SLOP.findall(body)
        route = '/docs/' + os.path.relpath(p, ROOT)[:-4].replace(os.sep, '/')
        route = re.sub(r'/index$', '', route)
        has_code = '```' in body or 'RunnableCode' in body
        has_limits = bool(LIMITS.search(body))
        h2 = len(re.findall(r'^## ', body, re.M))
        # Score 0-100: start at 100, subtract for each gap from the standard.
        score = 100
        if words < 600: score -= 35
        elif words < 1200: score -= 20
        elif words < 2000: score -= 8
        wpc = words / max(1, len(used))
        if len(used) >= 4 and wpc < 150: score -= 20
        elif len(used) >= 4 and wpc < 300: score -= 10
        score -= min(30, 6 * len(dark))
        score -= min(15, 3 * len(slop))
        if not has_code: score -= 5
        if not has_limits: score -= 10
        if h2 < 3: score -= 5
        rows.append(dict(route=route, file=p, score=max(0, score), words=words, components=len(used),
                         words_per_component=round(wpc), dark_components=len(dark), slop_hits=len(slop),
                         has_code=has_code, has_limits=has_limits, h2=h2,
                         dark_list=' '.join(dark), slop_list=' '.join(sorted(set(s.lower() for s in slop)))))

rows.sort(key=lambda r: (r['score'], r['words']))
out = sys.argv[1] if len(sys.argv) > 1 else 'content-audit.csv'
with open(out, 'w', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)

n = len(rows)
band = lambda lo, hi: sum(lo <= r['score'] < hi for r in rows)
print(f'pages: {n}')
print(f'score 90+: {band(90, 101)}   70-89: {band(70, 90)}   50-69: {band(50, 70)}   under 50: {band(0, 50)}')
print(f'under 600 words: {sum(r["words"] < 600 for r in rows)}   under 1200: {sum(r["words"] < 1200 for r in rows)}')
print(f'pages using dark widgets: {sum(r["dark_components"] > 0 for r in rows)}   slop hits: {sum(r["slop_hits"] > 0 for r in rows)}')
print(f'no limits section: {sum(not r["has_limits"] for r in rows)}   no code: {sum(not r["has_code"] for r in rows)}')
by = {}
for r in rows:
    sec = r['route'].split('/')[2] if r['route'].count('/') >= 2 else 'root'
    by.setdefault(sec, []).append(r['score'])
print('\nby section (pages, mean score, under 50):')
for sec, s in sorted(by.items(), key=lambda kv: sum(kv[1]) / len(kv[1])):
    print(f'  {sec:28} {len(s):4}  {sum(s)/len(s):5.1f}  {sum(x < 50 for x in s):4}')
