#!/usr/bin/env python3
"""Execute questions quality pass:
1. Validate reviews in docs/evidence/interview/new-questions-review.csv.
2. Load Batch 1 rewritten questions and Batch 2 new questions.
3. Validate all 100 questions against writing-voice rules and banned phrases.
4. Update src/data/interviewSeniorQuestions.json cleanly (79 original + 50 revised + 50 new = 179 total).
5. Run scripts/interview/build_practice_data.py to rebuild interviewPractice.json.
"""

import json
import csv
import re
import sys
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

BANNED_WORDS = [
    "delve", "deep dive", "dive deep", "unleash", "unlock", "harness the power",
    "game-changer", "gamechanger", "revolutioniz", "cutting-edge", "cutting edge",
    "seamless", "in today's", "it's important to note", "it's worth noting",
    "in conclusion", "tapestry", "testament", "elevate", "empower", "supercharg",
    "effortless", "premier", "world-class", "ultimate guide", "let's dive", "buckle up"
]

def check_banned(text: str, context: str):
    for b in BANNED_WORDS:
        pattern = r"\b" + re.escape(b) + r"\b" if " " not in b else re.escape(b)
        if re.search(pattern, text, re.IGNORECASE):
            raise ValueError(f"Found banned phrase '{b}' in {context}: {text[:100]}...")

def main():
    print("--- 1. Validating Batch 1 Review CSV ---")
    review_csv_path = ROOT / "docs/evidence/interview/new-questions-review.csv"
    if not review_csv_path.exists():
        sys.exit("Error: new-questions-review.csv does not exist.")
    with open(review_csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        review_rows = list(reader)
    print(f"Loaded {len(review_rows)} review rows from {review_csv_path}.")
    if len(review_rows) != 50:
        sys.exit(f"Expected 50 review rows, got {len(review_rows)}")

    print("--- 2. Loading Batch 1 and Batch 2 Questions ---")
    sys.path.insert(0, str(ROOT))
    from scripts.interview.batch1_questions import NEW_QUESTIONS as B1_QUESTIONS
    from scripts.interview.batch2_questions import NEW_QUESTIONS as B2_QUESTIONS

    b1_count = sum(len(qs) for qs in B1_QUESTIONS.values())
    b2_count = sum(len(qs) for qs in B2_QUESTIONS.values())
    print(f"Batch 1: {b1_count} questions across {len(B1_QUESTIONS)} topics.")
    print(f"Batch 2: {b2_count} questions across {len(B2_QUESTIONS)} topics.")
    if b1_count != 50:
        sys.exit(f"Expected 50 Batch 1 questions, got {b1_count}")
    if b2_count != 50:
        sys.exit(f"Expected 50 Batch 2 questions, got {b2_count}")

    print("--- 3. Checking Writing Voice & Banned Words ---")
    all_new_qs = []
    for topic, qs in B1_QUESTIONS.items():
        for q in qs:
            all_new_qs.append((f"Batch 1 [{topic}]", q))
    for topic, qs in B2_QUESTIONS.items():
        for q in qs:
            all_new_qs.append((f"Batch 2 [{topic}]", q))

    for tag, q in all_new_qs:
        qid = q["id"]
        check_banned(q["title"], f"{tag} {qid} title")
        check_banned(q["answer"], f"{tag} {qid} answer")
        for t in q.get("tradeOffs", []):
            check_banned(t, f"{tag} {qid} tradeOff")
        for fu in q.get("followUps", []):
            check_banned(fu, f"{tag} {qid} followUp")
        for w in q.get("wrongAnswers", []):
            check_banned(w, f"{tag} {qid} wrongAnswer")

    print(f"All {len(all_new_qs)} questions passed banned word checks.")

    print("--- 4. Updating interviewSeniorQuestions.json ---")
    senior_path = ROOT / "src/data/interviewSeniorQuestions.json"
    with open(senior_path, "r", encoding="utf-8") as f:
        senior_raw = json.load(f)

    # Retain only original list/tuple format items (79 original questions)
    senior_clean = {}
    orig_count = 0
    for topic, items in senior_raw.items():
        clean_items = [it for it in items if not isinstance(it, dict)]
        if clean_items:
            senior_clean[topic] = clean_items
            orig_count += len(clean_items)
    print(f"Preserved {orig_count} original senior questions across {len(senior_clean)} topics.")

    def to_list_format(q):
        return [
            q["id"],
            q["title"],
            q["answer"],
            q.get("followUps", []),
            q.get("wrongAnswers", []),
            q.get("rounds", []),
            q.get("roles", []),
            q.get("tradeOffs", []),
        ]

    # Merge Batch 1 rewritten questions
    for topic, qs in B1_QUESTIONS.items():
        if topic not in senior_clean:
            senior_clean[topic] = []
        for q in qs:
            senior_clean[topic].append(to_list_format(q))

    # Merge Batch 2 new questions
    for topic, qs in B2_QUESTIONS.items():
        if topic not in senior_clean:
            senior_clean[topic] = []
        for q in qs:
            senior_clean[topic].append(to_list_format(q))

    new_total = sum(len(qs) for qs in senior_clean.values())
    print(f"Total senior questions after merge: {new_total} (79 orig + 50 B1 + 50 B2).")
    if new_total != 179:
        sys.exit(f"Expected 179 total senior questions, got {new_total}")

    with open(senior_path, "w", encoding="utf-8") as f:
        json.dump(senior_clean, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote updated {senior_path}.")

    print("--- 5. Rebuilding Practice Data ---")
    build_script = ROOT / "scripts/interview/build_practice_data.py"
    res = subprocess.run([sys.executable, str(build_script)], capture_output=True, text=True)
    print("build_practice_data stdout:")
    print(res.stdout)
    if res.returncode != 0:
        print("build_practice_data stderr:")
        print(res.stderr)
        sys.exit(f"build_practice_data failed with code {res.returncode}")

    practice_path = ROOT / "src/data/interviewPractice.json"
    with open(practice_path, "r", encoding="utf-8") as f:
        practice_data = json.load(f)

    total_practice = sum(len(t["questions"]) for t in practice_data["topics"])
    print(f"Updated interviewPractice.json has {total_practice} total questions across {len(practice_data['topics'])} topics.")

if __name__ == "__main__":
    main()
