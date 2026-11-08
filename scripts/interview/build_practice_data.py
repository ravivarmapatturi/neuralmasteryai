#!/usr/bin/env python3
"""Merge our interview questions with the MIT-licensed ai-engineering-from-scratch bank into one practice file."""
import json, re, sys
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[2]
REPO = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parents[1] / "ai-engineering-from-scratch")
GITHUB = "https://github.com/rohitg00/ai-engineering-from-scratch/blob/main/interviews/questions"
# Our sections and question ids go into the same topic as the matching repo card.
SECTION_TOPIC = {
    "Overfitting, underfitting and validation": "math-classical-ml", "Metrics and thresholds": "math-classical-ml",
    "Models and features": "math-classical-ml", "Drift, monitoring and experiments": "production-mlops",
    "Reading the loss curve": "deep-learning", "Learning rates and optimisers": "deep-learning",
    "Normalisation and initialisation": "deep-learning", "Parameters and memory": "gpu-memory-quantization",
    "Prefill, decode and memory": "inference-serving", "Throughput, latency and batching": "inference-serving",
    "Fine-tuning": "post-training", "LLM Fundamentals": "transformers", "AI Agents": "agents",
    "Agentic & Self-Correcting RAG (Beyond the Basics)": "agents", "Evaluation & Testing (Advanced)": "evaluation",
    "RAG in Production — Deployment & Scaling": "production-mlops",
    "RAG in Production — Monitoring, Debugging & Incidents": "production-mlops",
    "RAG in Production — Security & Compliance": "safety", "System Design / Scenario Questions": "system-design",
}
CURATED_TOPIC = {"foundations": "post-training", "rag": "rag", "prompting": "prompting-structured-output",
                 "evaluation": "evaluation", "agents": "agents", "serving": "inference-serving"}
CURATED_OVERRIDE = {"genai-fm-fundamentals": "transformers", "genai-guardrails-prompt-injection-pii": "safety",
                    "genai-serving-quantization": "gpu-memory-quantization"}


def tidy(text):
    text = text.split("**Follow-ups")[0]
    text = re.sub(r"See \[[^\]]*\]\([^)]*\)\.?", "", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    return re.sub(r"\*\*|`", "", text).strip()


def words(text):
    return set(re.findall(r"[a-z0-9]+", text.lower())) - set("a an the is are of to in and or for what how why do does you your it that with on when".split())


cards = yaml.safe_load((REPO / "interviews/topics.yaml").read_text())
topics = {c["id"]: {"id": c["id"], "title": c["title"], "group": c["group"], "about": c["summary"], "questions": []}
          for c in cards["cards"] if c["id"] != "scenarios"}
ours = []
curated = json.loads((ROOT / "src/data/interviewModelAnswers.json").read_text())
titles = {q["id"]: q["title"] for q in json.loads((ROOT / "src/data/interviewRoomQuestions.json").read_text())["questions"]}
for t in curated["topics"]:
    for qid in t["questions"]:
        ours.append((CURATED_OVERRIDE.get(qid, CURATED_TOPIC[t["id"]]),
                     {"id": qid, "title": titles[qid], "answer": curated["answers"][qid]}))
for q in json.loads((ROOT / "src/data/interviewCatalog.generated.json").read_text())["questions"]:
    item = {"id": q["id"], "title": q["title"], "answer": tidy(q["answer"])}
    if q.get("options"):
        item["options"] = [o["text"] for o in q["options"]]
    ours.append((SECTION_TOPIC.get(q.get("section"), "rag"), item))
# Fundamentals and senior-round questions written for this site.
for topic, rows in json.loads((ROOT / "src/data/interviewSeniorQuestions.json").read_text()).items():
    for qid, title, answer in rows:
        ours.append((topic, {"id": f"senior:{qid}", "title": title, "answer": answer}))
for topic, item in ours:
    topics[topic]["questions"].append(item)

seen = [words(i["title"]) for _, i in ours]
stats = {"repo_files": 0, "duplicates": 0, "skipped_no_answer": 0, "skipped_needs_files": 0}
for f in sorted((REPO / "interviews/questions").glob("*/*.md")):
    if f.name == "README.md":
        continue
    stats["repo_files"] += 1
    _, head, body = f.read_text().split("---\n", 2)
    meta = yaml.safe_load(head)
    prompt = body.split("\n## ")[0].strip()
    m = re.search(r"^## Short answer\n+(.*?)(?=\n## )", body, re.S | re.M)
    if not m:
        stats["skipped_no_answer"] += 1
        continue
    if "```" in prompt or re.search(r"\b(evidence|attached|listing below|below)\b", prompt, re.I) and "```" in body.split("## Short answer")[0]:
        stats["skipped_needs_files"] += 1
        continue
    w = words(prompt)
    if any(len(w & s) / max(len(w | s), 1) > 0.6 for s in seen):
        stats["duplicates"] += 1
        continue
    seen.append(w)
    prompt = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", prompt).replace("`", "")
    answer = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", m.group(1)).replace("`", "").replace("**", "").strip()
    def bullets(heading):
        part = re.search(rf"^## {heading}\n+(.*?)(?=\n## |\Z)", body, re.S | re.M)
        if not part:
            return []
        items = re.findall(r"^- (.+)$", part.group(1), re.M)
        return [re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", i).replace("`", "").replace("**", "") for i in items][:4]
    topics[meta["card"]]["questions"].append({"id": f"repo:{meta['card']}:{meta['id']}", "title": prompt, "answer": answer,
                                              "sourceUrl": f"{GITHUB}/{meta['card']}/{f.name}",
                                              "followUps": bullets("Follow-ups"), "wrongAnswers": bullets("Wrong answers"),
                                              "rounds": meta.get("rounds") or [], "roles": meta.get("roles") or [],
                                              "priority": (meta.get("level", 2), -len(meta.get("roles") or []), -len(meta.get("rounds") or []))})
# Must-know first: our hand-written questions, then repo questions by level (basic first) and how many roles ask them.
for t in topics.values():
    t["questions"].sort(key=lambda q: (0, 0, 0) if "priority" not in q else (1, *q["priority"]))
    for q in t["questions"]:
        q.pop("priority", None)
out = {"groups": [g for g in cards["groups"] if g.get("id")], "topics": list(topics.values())}
(ROOT / "src/data/interviewPractice.json").write_text(json.dumps(out, ensure_ascii=False))
print(stats, sum(len(t["questions"]) for t in out["topics"]))
for t in out["topics"]:
    print(t["group"], t["id"], len(t["questions"]))
print(out["groups"])
