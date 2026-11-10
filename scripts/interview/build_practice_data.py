#!/usr/bin/env python3
"""Merge our interview questions with the MIT-licensed ai-engineering-from-scratch bank into one practice file."""
import json, re, sys
from pathlib import Path
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from open_answers import OPEN_ANSWERS, OPEN_TITLES

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

CURATED_LEVELS = {
    "genai-fm-fundamentals": "mid",
    "genai-chunking-strategies": "mid",
    "genai-prompt-structured-outputs": "mid",
    "genai-prompt-cot-reasoning": "mid",
    "genai-dense-vs-sparse-search": "mid",
    "genai-rag-vs-finetuning": "senior",
    "genai-lora-production-serving": "senior",
    "genai-rag-reranking-pipeline": "senior",
    "genai-eval-llm-as-judge": "senior",
    "genai-eval-rag-triad-hallucination": "senior",
    "genai-hallucination-mitigation": "senior",
    "genai-agent-react-tool-calling": "senior",
    "genai-guardrails-prompt-injection-pii": "senior",
    "genai-cost-latency-ttft-tpot": "senior",
    "genai-serving-kv-cache-pagedattention": "senior",
    "genai-serving-quantization": "senior",
    "genai-finetuning-alignment-dpo-rlhf": "senior",
    "genai-finetuning-data-curation-forgetting": "senior",
    "genai-rag-advanced-query-expansion": "senior",
    "genai-agent-single-vs-multi": "staff",
}

SECTION_LEVELS = {
    "Overfitting, underfitting and validation": "mid",
    "Metrics and thresholds": "mid",
    "Models and features": "mid",
    "Reading the loss curve": "mid",
    "Learning rates and optimisers": "mid",
    "Normalisation and initialisation": "mid",
    "LLM Fundamentals": "mid",
    "Parameters and memory": "senior",
    "Prefill, decode and memory": "senior",
    "Throughput, latency and batching": "senior",
    "Fine-tuning": "senior",
    "Drift, monitoring and experiments": "senior",
    "RAG in Production — Deployment & Scaling": "senior",
    "RAG in Production — Monitoring, Debugging & Incidents": "senior",
    "RAG in Production — Security & Compliance": "senior",
    "Agentic & Self-Correcting RAG (Beyond the Basics)": "senior",
    "AI Agents": "senior",
    "Evaluation & Testing (Advanced)": "senior",
    "System Design / Scenario Questions": "staff",
}


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
topics["debug"] = {
    "id": "debug",
    "title": "Debug this",
    "group": "rounds",
    "about": "Production failure scenarios with real metrics: triage hypotheses in order, test each root cause, deploy fixes, and prevent recurrence.",
    "questions": [],
}
ours = []
curated = json.loads((ROOT / "src/data/interviewModelAnswers.json").read_text())
titles = {q["id"]: q["title"] for q in json.loads((ROOT / "src/data/interviewRoomQuestions.json").read_text())["questions"]}
for t in curated["topics"]:
    for qid in t["questions"]:
        level = CURATED_LEVELS.get(qid, "senior")
        ours.append((CURATED_OVERRIDE.get(qid, CURATED_TOPIC[t["id"]]),
                     {"id": qid, "title": titles[qid], "answer": curated["answers"][qid], "level": level}))
for q in json.loads((ROOT / "src/data/interviewCatalog.generated.json").read_text())["questions"]:
    if q.get("bank") == "software-system-design-questions":
        continue
    level = SECTION_LEVELS.get(q.get("section"), "mid")
    item = {"id": q["id"], "title": q["title"], "answer": tidy(q["answer"]), "level": level}
    if "keyPoints" in q:
        item["keyPoints"] = q["keyPoints"]
    # Catalog quiz questions are asked aloud as open questions, so options are not carried over.
    short_id = q["id"].split(":")[-1]
    if short_id in OPEN_TITLES:
        item["title"] = OPEN_TITLES[short_id]
    if short_id in OPEN_ANSWERS:
        item["answer"] = OPEN_ANSWERS[short_id]
    ours.append((SECTION_TOPIC.get(q.get("section"), "rag"), item))
# Fundamentals and senior-round questions written for this site.
for topic, rows in json.loads((ROOT / "src/data/interviewSeniorQuestions.json").read_text()).items():
    for item in rows:
        if isinstance(item, dict):
            level = item.get("level")
            if not level:
                if any(w in item["title"].lower() for w in ["governance", "multi-tenant", "distributed", "allreduce", "nccl", "quota", "cross-org", "cluster", "sandbox", "audit", "rsp"]):
                    level = "staff"
                elif topic in ("coding", "math-classical-ml") and not any(w in item["title"].lower() for w in ["drift", "leakage", "scale"]):
                    level = "mid"
                else:
                    level = "senior"
            q_data = {"id": f"senior:{item['id']}", "title": item["title"], "answer": item["answer"], "level": level}
            for k in ["keyPoints", "tradeOffs", "followUps", "wrongAnswers", "rounds", "roles", "problemId"]:
                if k in item:
                    q_data[k] = item[k]
            ours.append((topic, q_data))
        elif isinstance(item, (list, tuple)):
            qid, title, answer = item[0], item[1], item[2]
            metadata = item[3] if len(item) > 3 and isinstance(item[3], dict) else {}
            level = metadata.get("level") or (item[8] if len(item) > 8 else None)
            if not level:
                if any(w in title.lower() for w in ["governance", "multi-tenant", "distributed", "allreduce", "nccl", "quota", "cross-org", "cluster", "sandbox", "audit", "rsp", "speculative-decoding-throughput"]):
                    level = "staff"
                elif topic in ("coding", "math-classical-ml") and not any(w in title.lower() for w in ["drift", "leakage", "scale"]):
                    level = "mid"
                else:
                    level = "senior"
            q_data = {"id": f"senior:{qid}", "title": title, "answer": answer, "level": level}
            if metadata:
                q_data.update(metadata)
            elif len(item) > 3:
                q_data["followUps"] = item[3]
            if len(item) > 4:
                q_data["wrongAnswers"] = item[4]
            if len(item) > 5:
                q_data["rounds"] = item[5]
            if len(item) > 6:
                q_data["roles"] = item[6]
            if len(item) > 7:
                q_data["tradeOffs"] = item[7]
            if len(item) > 9 and item[9]:
                q_data["problemId"] = item[9]
            ours.append((topic, q_data))
titles_seen = set()
for topic, item in ours:
    key = item["title"].strip().lower()
    if key in titles_seen:
        continue
    titles_seen.add(key)
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
    meta_lvl = meta.get("level", 2)
    lvl_tag = "mid" if meta_lvl in (1, 2) else ("senior" if meta_lvl == 3 else "staff")
    topics[meta["card"]]["questions"].append({"id": f"repo:{meta['card']}:{meta['id']}", "title": prompt, "answer": answer,
                                              "sourceUrl": f"{GITHUB}/{meta['card']}/{f.name}",
                                              "followUps": bullets("Follow-ups"), "wrongAnswers": bullets("Wrong answers"),
                                              "rounds": meta.get("rounds") or [], "roles": meta.get("roles") or [],
                                              "level": lvl_tag,
                                              "priority": (meta.get("level", 2), -len(meta.get("roles") or []), -len(meta.get("rounds") or []))})
    if "keyPoints" in meta:
        topics[meta["card"]]["questions"][-1]["keyPoints"] = meta["keyPoints"]
# Must-know first: our hand-written questions, then repo questions by level (basic first) and how many roles ask them.
def validate_key_points(item):
    if "keyPoints" not in item:
        return
    points = item["keyPoints"]
    if (not isinstance(points, list) or not 3 <= len(points) <= 6
            or any(not isinstance(p, str) or not p.strip() or len(p) > 200 for p in points)
            or len(set(points)) != len(points)):
        raise ValueError(f"Invalid keyPoints for {item['id']}: expected 3 to 6 unique short points")


# Hand-authored rubrics are keyed by stable practice IDs, independent of source format.
# Keep answer text and all source metadata intact when rebuilding the bank.
key_point_overrides = json.loads((ROOT / "src/data/interviewKeyPoints.json").read_text())
question_ids = {q["id"] for t in topics.values() for q in t["questions"]}
unknown_ids = set(key_point_overrides) - question_ids
if unknown_ids:
    raise ValueError(f"Unknown key-point question IDs: {sorted(unknown_ids)}")
def apply_key_point_override(item, overrides):
    if item["id"] in overrides:
        if "keyPoints" in item:
            raise ValueError(f"Key-point override would replace an existing rubric: {item['id']}")
        item["keyPoints"] = overrides[item["id"]]
    validate_key_points(item)


for t in topics.values():
    for item in t["questions"]:
        apply_key_point_override(item, key_point_overrides)
    t["questions"].sort(key=lambda q: (0, 0, 0) if "priority" not in q else (1, *q["priority"]))
    for q in t["questions"]:
        q.pop("priority", None)
out = {"groups": [g for g in cards["groups"] if g.get("id")], "topics": list(topics.values())}
(ROOT / "src/data/interviewPractice.json").write_text(json.dumps(out, ensure_ascii=False))
print(stats, sum(len(t["questions"]) for t in out["topics"]))
for t in out["topics"]:
    print(t["group"], t["id"], len(t["questions"]))
print(out["groups"])
counts_path = ROOT / "src/data/interviewCounts.generated.json"
counts = json.loads(counts_path.read_text())
counts["questions"] = sum(len(t["questions"]) for t in out["topics"])
counts_path.write_text(json.dumps(counts))
