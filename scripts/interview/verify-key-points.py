#!/usr/bin/env python3
"""Audit an answer-grounded rubric batch against its frozen Git baseline."""
import ast
import argparse
import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument("--baseline", default="3b261bd1")
parser.add_argument("--batch", default="b4")
parser.add_argument("--expected", type=int, default=200)
parser.add_argument("--allow-new-reference-rubrics", action="store_true",
                    help="Permit new practice rubrics on previously reference-only frozen questions; never change frozen inputs")
args = parser.parse_args()
BASE = args.baseline


def read(name):
    return json.loads((ROOT / name).read_text())


def flat(bank):
    rows = [q for topic in bank["topics"] for q in topic["questions"]]
    assert len({q["id"] for q in rows}) == len(rows), "Duplicate question ID"
    return {q["id"]: q for q in rows}


before = flat(json.loads(subprocess.check_output(
    ["git", "show", f"{BASE}:src/data/interviewPractice.json"], cwd=ROOT)))
bank = read("src/data/interviewPractice.json")
after = flat(bank)
overrides = read("src/data/interviewKeyPoints.json")
assert len(before) == len(after) == 917
assert before.keys() == after.keys(), "Question IDs changed"
overrides = {qid: points for qid, points in overrides.items() if "keyPoints" not in before[qid]}
assert len(overrides) == args.expected
assert all(len(points) == 4 for points in overrides.values()), "Batch rubrics must have four points"
module = ast.parse((ROOT / "scripts/interview/build_practice_data.py").read_text())
validator = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == "validate_key_points")
namespace = {}
exec(compile(ast.Module(body=[validator], type_ignores=[]), "<validator>", "exec"), namespace)
for qid, question in after.items():
    original = before[qid]
    assert {k: v for k, v in question.items() if k != "keyPoints"} == {
        k: v for k, v in original.items() if k != "keyPoints"
    }, f"Answer or non-rubric metadata changed: {qid}"
    if qid in overrides:
        assert "keyPoints" not in original, f"Existing rubric overwritten: {qid}"
        assert question["keyPoints"] == overrides[qid], f"Override not carried through: {qid}"
        namespace["validate_key_points"](question)
    else:
        assert question.get("keyPoints") == original.get("keyPoints"), f"Unrelated rubric changed: {qid}"

sample = read(f"docs/evidence/interview/{args.batch}-support-sample.json")
assert len(sample["questions"]) == 30
assert len({q["questionId"] for q in sample["questions"]}) == 30
for row in sample["questions"]:
    question = after[row["questionId"]]
    assert [c["point"] for c in row["checks"]] == overrides[row["questionId"]]
    for check in row["checks"]:
        assert check["verdict"] == "supported"
        assert all(excerpt in question["answer"] for excerpt in check["answerExcerpts"]), row["questionId"]
# These assertions verify provenance integrity, not semantic entailment; the sample
# verdicts are a recorded manual reading of each point against its own answer.
heldout = read("docs/evidence/interview/judge-v2-heldout.json")
ground_truth = read("docs/evidence/interview/judge-v2-ground-truth.json")
for frozen in ("judge-v2-heldout.json", "judge-v2-ground-truth.json",
               "judge-v2-model-manifest.json", "judge-v2-thresholds.json"):
    path = f"docs/evidence/interview/{frozen}"
    assert (ROOT / path).read_bytes() == subprocess.check_output(
        ["git", "show", f"{BASE}:{path}"], cwd=ROOT), f"Frozen artifact changed: {frozen}"
for example in heldout["examples"]:
    qid = example["questionId"]
    for field in ("answer", "keyPoints"):
        assert before[qid].get(field) == ground_truth[qid].get(field)
        if (field == "keyPoints" and args.allow_new_reference_rubrics
                and field not in before[qid] and qid in overrides):
            continue
        assert after[qid].get(field) == before[qid].get(field)
answers = sorted((qid, q["answer"]) for qid, q in after.items())
print(json.dumps({
    "baseline": BASE,
    "questionsBefore": len(before), "questionsAfter": len(after),
    "answersChanged": 0, "otherQuestionMetadataChanged": 0,
    "existingRubricsPreserved": sum("keyPoints" in q for q in before.values()),
    "newRubrics": len(overrides), "rubricsAfter": sum("keyPoints" in q for q in after.values()),
    "newPoints": sum(map(len, overrides.values())),
    "newRubricsByTopic": dict(Counter(t["id"] for t in bank["topics"] for q in t["questions"] if q["id"] in overrides)),
    "answerPairsSha256": hashlib.sha256(json.dumps(answers, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest(),
    "sampleQuestions": len(sample["questions"]), "samplePoints": sum(len(r["checks"]) for r in sample["questions"]),
    "unchangedHeldoutAnswers": len(heldout["examples"]),
    "newPracticeRubricsOnFrozenReferenceQuestions": len({
        e["questionId"] for e in heldout["examples"]
        if e["questionId"] in overrides and "keyPoints" not in before[e["questionId"]]
    }),
    "heldoutNote": "Frozen harness inputs match the baseline; new practice reference rubrics, if allowed, are not exercised by that harness. This is not an inference measurement.",
}, indent=2))
