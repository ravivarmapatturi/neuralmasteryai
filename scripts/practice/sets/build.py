"""Generate the hand-written problem sets (roadmap tasks 26-35).

    python3 -I scripts/practice/sets/build.py          # write files
    python3 -I scripts/practice/sets/build.py --check  # verify only

Each set lives in its own module here (SET = {...}, PROBLEMS = [...]).
For every problem this:
  1. runs the reference solution on every test (inputs JSON round-tripped
     as the browser worker sends them) and records expectedOutput, failing
     if a hand-pinned `expect` disagrees;
  2. runs the starter code and fails if it passes every test;
  3. writes src/data/practice/problemSets.generated.json (structured
     problems for PracticeWorkspace) and one MDX page per problem.
The catalogue entries themselves are in src/data/practiceCatalog.ts.
"""
import importlib
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)

SETS = ["numpy_sheet", "micrograd", "attention", "tokenizer", "optimizers", "losses", "metrics", "rag_pieces"]
POINTS = {"easy": 25, "medium": 50, "hard": 100}
TIME = {"easy": "10 min", "medium": "15-20 min", "hard": "25-35 min"}


def plain(value):
    """numpy arrays/scalars -> lists/floats, the way the judge's _safe_eq sees them."""
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, tuple):
        return [plain(v) for v in value]
    if isinstance(value, list):
        return [plain(v) for v in value]
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    return value


def safe_eq(actual, expected):
    """Mirror of _safe_eq in src/workers/pyodideWorker.ts."""
    actual, expected = plain(actual), plain(expected)
    if isinstance(actual, bool) or isinstance(expected, bool):
        return actual == expected
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)):
        return actual == expected or abs(float(actual) - float(expected)) < 1e-5
    if isinstance(actual, list) and isinstance(expected, list):
        return len(actual) == len(expected) and all(safe_eq(a, e) for a, e in zip(actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(safe_eq(actual[k], expected[k]) for k in actual)
    return actual == expected


def run(code, fn, test):
    ns = {}
    exec(code, ns)
    kwargs = json.loads(json.dumps(test["input"]))
    try:
        return "ok", ns[fn](**kwargs)
    except Exception as e:  # noqa: BLE001
        return "error", type(e).__name__


def check_finite(value, where):
    if isinstance(value, float) and not math.isfinite(value):
        raise SystemExit(f"{where}: non-finite expected output")
    if isinstance(value, list):
        for v in value: check_finite(v, where)
    if isinstance(value, dict):
        for v in value.values(): check_finite(v, where)


def build_problem(p, track, prev_id, number):
    tests = []
    for i, t in enumerate(p["tests"], start=1):
        kind, out = run(p["solution"], p["fn"], t)
        case = {"id": f"tc{i}", "label": t["label"], "input": t["input"]}
        if t.get("hidden"):
            case["hidden"] = True
        if "error" in t:
            if (kind, out) != ("error", t["error"]):
                raise SystemExit(f"{p['id']} {case['id']}: expected {t['error']}, reference gave {kind} {out}")
            case["expectError"] = t["error"]
        else:
            if kind != "ok":
                raise SystemExit(f"{p['id']} {case['id']}: reference raised {out}")
            out = json.loads(json.dumps(plain(out)))
            if "expect" in t and not safe_eq(out, t["expect"]):
                raise SystemExit(f"{p['id']} {case['id']}: pinned {t['expect']!r}, reference gave {out!r}")
            check_finite(out, p["id"])
            case["expectedOutput"] = out
        tests.append(case)
    starter_passes = all(
        (lambda r: (r == ("error", c["expectError"])) if "expectError" in c else (r[0] == "ok" and safe_eq(r[1], c["expectedOutput"])))(run(p["starter"], p["fn"], c))
        for c in tests
    )
    if starter_passes:
        raise SystemExit(f"{p['id']}: the starter passes every test")
    return {
        "id": p["id"],
        "title": p["title"],
        "difficulty": p["difficulty"],
        "topic": track["title"],
        "estimatedTime": TIME[p["difficulty"]],
        "functionName": p["fn"],
        "functionSignature": p["signature"],
        "starterCode": p["starter"].strip() + "\n",
        "mission": p["mission"],
        "taskDescription": p["task"],
        "constraints": p["constraints"],
        "testCases": tests,
        "libraryPolicyText": "NumPy available · runs in your browser" if p.get("numpy") else "Standard library only · runs in your browser",
        "hints": p["hints"],
        "conceptConnections": [track["learn"]],
        "runtime": {"language": "python", "capabilities": ["python", "numpy"] if p.get("numpy") else ["python"]},
        "judgeMode": "local",
        "prerequisite": prev_id if track.get("project") else None,
        "stage": track["title"],
        "stageNumber": number,
        "points": POINTS[p["difficulty"]],
    }


def mdx_for(p, track, number, total):
    desc = p["mission"].split(". ")[0].rstrip(".") + "."
    return f'''---
title: {json.dumps(p["title"])}
description: {json.dumps(f"{track['title']}, problem {number} of {total}: {desc}")}
difficulty: "{p['difficulty']}"
topic: {json.dumps(track["title"])}
---

import {{ Solution }} from '../../../components/content/ExpandableDepth';

{p["intuition"].strip()}

## Reference solution

Try the tests first. The reference is here to compare approaches after you pass, or to get unstuck after a real attempt.

<Solution title="Show the reference solution">

```python
{p["solution"].strip()}
```

</Solution>
'''


def main():
    check_only = "--check" in sys.argv
    problems, pages = [], {}
    seen = set()
    for name in [s for s in SETS if os.path.exists(os.path.join(HERE, s + ".py"))]:
        mod = importlib.import_module(name)
        track, items = mod.SET, mod.PROBLEMS
        prev = None
        for n, p in enumerate(items, start=1):
            if p["id"] in seen:
                raise SystemExit(f"duplicate id {p['id']}")
            seen.add(p["id"])
            problems.append(build_problem(p, track, prev, n))
            pages[p["id"]] = mdx_for(p, track, n, len(items))
            prev = p["id"]
        print(f"{track['title']}: {len(items)} problems ok")
    if check_only:
        return
    with open(os.path.join(ROOT, "src", "data", "practice", "problemSets.generated.json"), "w", encoding="utf-8") as f:
        json.dump(problems, f, indent=1, ensure_ascii=False)
        f.write("\n")
    for pid, text in pages.items():
        with open(os.path.join(ROOT, "src", "content", "docs", "practice-problems", pid + ".mdx"), "w", encoding="utf-8") as f:
            f.write(text)
    print(f"wrote {len(problems)} problems")


if __name__ == "__main__":
    main()
