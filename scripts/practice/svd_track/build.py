"""Generate the "Specify, Verify, Debug" practice track from stages.py.

    python3 -I scripts/practice/svd_track/build.py          # write files
    python3 -I scripts/practice/svd_track/build.py --check  # verify only

For every stage this:
  1. runs the reference solution against every test (inputs JSON
     round-tripped exactly as the browser worker sends them) and fills in
     expectedOutput -- failing loudly if a hand-pinned `expect` disagrees;
  2. runs the STARTER code against the same tests and fails if it passes
     them all (a test suite the starter can pass tests nothing);
  3. writes src/data/practice/specifyVerifyDebug.generated.json and one MDX
     page per stage (the write-up + collapsed reference solution).
"""
import copy
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

from stages import STAGES  # noqa: E402

TRACK = "Specify, Verify, Debug"
POINTS = {"easy": 10, "medium": 20, "hard": 30}
IMPORTS = "import json\nimport math\nimport re\nfrom datetime import date, datetime, timedelta\n"
PROVIDED_BANNER = (
    "\n\n# =============================================================================\n"
    "# PROVIDED BELOW -- part of Helpdesk. Read it, don't edit it.\n"
    "# =============================================================================\n"
)


def safe_eq(actual, expected):
    """Mirror of _safe_eq in src/workers/pyodideWorker.ts."""
    if actual is expected:
        return True
    if isinstance(actual, (int, float)) and isinstance(expected, (int, float)) \
            and not isinstance(actual, bool) and not isinstance(expected, bool):
        return abs(float(actual) - float(expected)) < 1e-5
    if isinstance(actual, (list, tuple)) and isinstance(expected, (list, tuple)):
        return len(actual) == len(expected) and all(safe_eq(a, e) for a, e in zip(actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        a = {str(k): v for k, v in actual.items()}
        e = {str(k): v for k, v in expected.items()}
        return a.keys() == e.keys() and all(safe_eq(a[k], e[k]) for k in a)
    return actual == expected


def starter_code(stage):
    body = IMPORTS + "\n\n" + stage["stub"].strip() + "\n"
    provided = stage["provided_code"].strip("\n")
    return body + (PROVIDED_BANNER + provided + "\n" if provided else "")


def reference_code(stage):
    return IMPORTS + "\n" + stage["solution"] + "\n" + stage["provided_code"]


def run_case(code, fn, test):
    ns = {"__name__": "practice"}
    exec(compile(code, "<practice>", "exec"), ns)
    kwargs = json.loads(json.dumps(test["input"]))
    try:
        out = ns[fn](**copy.deepcopy(kwargs))
    except Exception as e:  # noqa: BLE001
        return ("raised", type(e).__name__, str(e))
    return ("ok", json.loads(json.dumps(out)), None)


def build_stage(stage, prev_id):
    fn = stage["function"]
    ref = reference_code(stage)
    cases = []
    for t in stage["tests"]:
        kind, value, msg = run_case(ref, fn, t)
        if t["error"]:
            assert kind == "raised" and value == t["error"], f"{stage['id']}/{t['id']}: expected {t['error']}, got {kind} {value} {msg}"
            expected = None
        else:
            assert kind == "ok", f"{stage['id']}/{t['id']}: reference raised {value}: {msg}"
            if t["has_expect"]:
                assert safe_eq(value, t["expect"]), f"{stage['id']}/{t['id']}:\n  got    {value!r}\n  pinned {t['expect']!r}"
            expected = value
        case = {"id": t["id"], "label": t["label"], "input": t["input"], "expectedOutput": expected, "hidden": t["hidden"]}
        if t["error"]:
            case["expectError"] = t["error"]
        if t["description"]:
            case["description"] = t["description"]
        cases.append(case)

    starter = starter_code(stage)
    stub_passes = 0
    for t, c in zip(stage["tests"], cases):
        kind, value, _ = run_case(starter, fn, t)
        if t["error"]:
            stub_passes += kind == "raised" and value == t["error"]
        else:
            stub_passes += kind == "ok" and safe_eq(value, c["expectedOutput"])
    assert stub_passes < len(cases), f"{stage['id']}: starter code passes every test"

    visible = sum(1 for c in cases if not c["hidden"])
    print(f"  {stage['n']:>2}. {stage['id']:<32} {stage['difficulty']:<6} tests {len(cases)} "
          f"({visible} visible, {len(cases) - visible} hidden)  starter passes {stub_passes}")

    return {
        "id": stage["id"], "title": stage["title"], "difficulty": stage["difficulty"], "topic": TRACK,
        "estimatedTime": stage["time"], "functionName": fn, "functionSignature": stage["signature"],
        "starterCode": starter, "mission": stage["mission"], "taskDescription": stage["task"].strip(),
        "constraints": stage["constraints"], "testCases": cases,
        "libraryPolicyText": "Standard library only · runs in your browser",
        "hints": stage["hints"], "conceptConnections": stage["connections"],
        "runtime": {"language": "python", "capabilities": ["python"]}, "judgeMode": "local",
        "prerequisite": prev_id, "stage": TRACK, "stageNumber": stage["n"], "points": POINTS[stage["difficulty"]],
    }


def escape_money(text):
    """remark-math reads text between two $ signs as maths, so "$5 ... $50" in
    prose would render as a formula. Escape a $ before a digit, outside code."""
    parts = re.split(r"(```.*?```|`[^`\n]*`)", text, flags=re.S)
    return "".join(p if p.startswith("`") else re.sub(r"(?<![\\$])\$(?=\d)", r"\\$", p) for p in parts)


def mdx_for(stage):
    desc = stage["mission"].split(". ")[0].rstrip(".") + "."
    solution = stage["solution"].strip()
    return f'''---
title: "{stage['title']}"
description: {json.dumps(f"Specify, Verify, Debug, stage {stage['n']} of {len(STAGES)}: {desc}")}
difficulty: "{stage['difficulty']}"
topic: "{TRACK}"
sidebar_position: {2100 + stage['n']}
---

import {{ Solution }} from '../../../components/content/ExpandableDepth';

{escape_money(stage['intuition'].strip())}

## Reference solution

Try the tests first. The reference is here so you can compare approaches after you've passed, or get unstuck after a real attempt.

<Solution title="Show the reference solution">

```python
{solution}
```

</Solution>
'''


def main():
    check_only = "--check" in sys.argv
    print(f"{TRACK} -- {len(STAGES)} stages")
    problems = []
    prev = None
    for stage in STAGES:
        problems.append(build_stage(stage, prev))
        prev = stage["id"]
    if check_only:
        print("check OK")
        return
    out = os.path.join(ROOT, "src", "data", "practice", "specifyVerifyDebug.generated.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w") as f:
        json.dump(problems, f, indent=1, ensure_ascii=False)
        f.write("\n")
    for stage in STAGES:
        path = os.path.join(ROOT, "src", "content", "docs", "practice-problems", stage["id"] + ".mdx")
        with open(path, "w") as f:
            f.write(mdx_for(stage))
    print(f"wrote {os.path.relpath(out, ROOT)} and {len(STAGES)} MDX pages")


if __name__ == "__main__":
    main()
