"""Reference solutions and provided code for the "Specify, Verify, Debug" track.

Each constant is Python source. build.py executes it to compute every
expected output, so a test can only expect what the reference really does.
"""

# --- Stage 1: turn the request into tests -----------------------------------

# The shop's rule, as written by the owner, implemented correctly. Learners
# never see this one: it is the "reference" their test cases must pass.
REFUND_RULES = r'''
from datetime import date


def _days(start, end):
    return (date.fromisoformat(end) - date.fromisoformat(start)).days


def reference(order, request_date):
    if order["final_sale"]:
        return False
    if order["total"] < 5:
        return False
    if order["digital"] and order["downloaded"]:
        return False
    return 0 <= _days(order["delivered"], request_date) <= 30


# What the coding agent shipped, in six versions. Each one does what its
# author understood the rule to be.
def agent_a(order, request_date):  # counts from the order date
    if order["final_sale"] or order["total"] < 5 or (order["digital"] and order["downloaded"]):
        return False
    return 0 <= _days(order["ordered"], request_date) <= 30


def agent_b(order, request_date):  # day 30 itself rejected
    if order["final_sale"] or order["total"] < 5 or (order["digital"] and order["downloaded"]):
        return False
    return 0 <= _days(order["delivered"], request_date) < 30


def agent_c(order, request_date):  # forgets the download rule
    if order["final_sale"] or order["total"] < 5:
        return False
    return 0 <= _days(order["delivered"], request_date) <= 30


def agent_d(order, request_date):  # rejects exactly $5.00
    if order["final_sale"] or order["total"] <= 5 or (order["digital"] and order["downloaded"]):
        return False
    return 0 <= _days(order["delivered"], request_date) <= 30


def agent_e(order, request_date):  # forgets final sale
    if order["total"] < 5 or (order["digital"] and order["downloaded"]):
        return False
    return 0 <= _days(order["delivered"], request_date) <= 30


def agent_f(order, request_date):  # accepts day 31
    if order["final_sale"] or order["total"] < 5 or (order["digital"] and order["downloaded"]):
        return False
    return 0 <= _days(order["delivered"], request_date) <= 31


IMPLEMENTATIONS = {
    "reference": reference, "agent_a": agent_a, "agent_b": agent_b, "agent_c": agent_c,
    "agent_d": agent_d, "agent_e": agent_e, "agent_f": agent_f,
}

ORDER_FIELDS = {"ordered", "delivered", "digital", "downloaded", "total", "final_sale"}


def run_suite(implementation):
    """Run your acceptance_cases() against one implementation.
    "pass": every case passed. "caught": at least one failed. "no tests": nothing to run."""
    cases = acceptance_cases()
    if not cases:
        return "no tests"
    impl = IMPLEMENTATIONS[implementation]
    for case in cases:
        if set(case) != {"order", "request_date", "expected"} or set(case["order"]) != ORDER_FIELDS:
            raise ValueError(f"malformed case: {case!r}")
        try:
            if impl(case["order"], case["request_date"]) != case["expected"]:
                return "caught"
        except Exception:
            return "caught"
    return "pass"
'''

ACCEPTANCE_CASES = r'''
def order(ordered="2026-03-01", delivered="2026-03-05", digital=False, downloaded=False,
          total=40.0, final_sale=False):
    return {"ordered": ordered, "delivered": delivered, "digital": digital,
            "downloaded": downloaded, "total": total, "final_sale": final_sale}


def acceptance_cases():
    return [
        # The window runs from delivery, not from the order.
        {"order": order(), "request_date": "2026-04-04", "expected": True},     # day 30 after delivery
        {"order": order(), "request_date": "2026-04-05", "expected": False},    # day 31
        {"order": order(), "request_date": "2026-03-05", "expected": True},     # same day
        # Digital: fine until downloaded.
        {"order": order(digital=True), "request_date": "2026-03-10", "expected": True},
        {"order": order(digital=True, downloaded=True), "request_date": "2026-03-10", "expected": False},
        # The $5 line: under $5 is out, exactly $5 is in.
        {"order": order(total=4.99), "request_date": "2026-03-10", "expected": False},
        {"order": order(total=5.0), "request_date": "2026-03-10", "expected": True},
        # Final sale never.
        {"order": order(final_sale=True), "request_date": "2026-03-10", "expected": False},
    ]
'''

# --- Stage 2: the code is right, the rule is wrong ---------------------------

LOCAL_DAYS = r'''
def local_days_between(delivered_at, requested_at, tz_offset_hours):
    offset = timedelta(hours=tz_offset_hours)
    start = datetime.fromisoformat(delivered_at.replace("Z", "+00:00")) + offset
    end = datetime.fromisoformat(requested_at.replace("Z", "+00:00")) + offset
    return (end.date() - start.date()).days
'''

# --- Stage 3: read the logs before the code ----------------------------------

FIRST_FAILURE = r'''
def first_failure(lines):
    errors = []
    for position, line in enumerate(lines):
        fields = {}
        parts = line.split(" ")
        for part in parts[1:]:
            if "=" in part:
                key, _, value = part.partition("=")
                fields[key] = value
        try:
            at = datetime.fromisoformat(parts[0].replace("Z", "+00:00"))
        except ValueError:
            continue
        if fields.get("level") != "ERROR" or "svc" not in fields:
            continue
        errors.append((at, position, fields["svc"], fields.get("req"), parts[0]))
    if not errors:
        return None
    at, _, service, request_id, raw_time = min(errors)
    return {"service": service, "request_id": request_id, "time": raw_time}
'''

# --- Stage 4: retries refund twice ------------------------------------------

HANDLE_REFUND = r'''
def handle(store, request):
    key = request["idempotency_key"]
    body = {"order_id": request["order_id"], "amount": request["amount"]}
    if key in store["seen"]:
        first_body, response = store["seen"][key]
        if first_body != body:
            return {"status": "error", "code": "idempotency_key_reused"}
        return response
    order = store["orders"].get(body["order_id"])
    if order is None:
        response = {"status": "error", "code": "unknown_order"}
    elif body["amount"] <= 0:
        response = {"status": "error", "code": "invalid_amount"}
    elif store["refunded"].get(body["order_id"], 0) + body["amount"] > order["total"]:
        response = {"status": "error", "code": "exceeds_order_total"}
    else:
        store["refunded"][body["order_id"]] = store["refunded"].get(body["order_id"], 0) + body["amount"]
        store["next_id"] += 1
        response = {"status": "ok", "refund_id": "rf-" + str(store["next_id"])}
    store["seen"][key] = (body, response)
    return response
'''

PROCESS_REQUESTS = r'''
def process_requests(orders, requests):
    """Replay the requests exactly as the payment API received them,
    retries included, and report what each caller got back."""
    store = {"orders": orders, "refunded": {}, "seen": {}, "next_id": 1000}
    responses = [handle(store, dict(r)) for r in requests]
    return {"responses": responses, "refunded": store["refunded"]}
'''

# --- Stage 5: stale answers after a policy change ----------------------------

CACHE_KEY = r'''
def cache_key(question, retrieved):
    normalized = " ".join(question.lower().split()).rstrip("?.! ")
    versions = ",".join(f"{doc['id']}@{doc['version']}" for doc in sorted(retrieved, key=lambda d: d["id"]))
    return normalized + "|" + versions
'''

HELPDESK_RAG = r'''
def retrieve(docs, question):
    """Keyword retrieval: a document matches when it shares a topic word with the question."""
    words = set(question.lower().replace("?", " ").split())
    hits = [d for d in docs.values() if words & set(d["topics"])]
    return [{"id": d["id"], "version": d["version"]} for d in sorted(hits, key=lambda d: d["id"])]


def answer_from(docs, retrieved):
    if not retrieved:
        return "I couldn't find that in our policies."
    return " ".join(docs[r["id"]]["text"] for r in retrieved)


def run_session(docs, events):
    """Replay a day of traffic. Each event is {"ask": question} or
    {"update": doc_id, "text": new_text}. Returns every answer given and
    how many questions were served from the cache."""
    docs = {d["id"]: dict(d) for d in docs}
    cache, answers, hits = {}, [], 0
    for event in events:
        if "update" in event:
            doc = docs[event["update"]]
            doc["text"] = event["text"]
            doc["version"] += 1
            continue
        retrieved = retrieve(docs, event["ask"])
        key = cache_key(event["ask"], retrieved)
        if key in cache:
            hits += 1
        else:
            cache[key] = answer_from(docs, retrieved)
        answers.append(cache[key])
    return {"answers": answers, "cache_hits": hits}
'''

# --- Stage 6: measure retrieval before tuning it ----------------------------

RETRIEVAL_REPORT = r'''
def retrieval_report(results, labels, k):
    per_query = []
    unlabeled = 0
    for row in results:
        relevant = set(labels.get(row["query_id"], []))
        if not relevant:
            unlabeled += 1
            continue
        top = []
        for doc in row["retrieved"]:
            if doc not in top:
                top.append(doc)
        top = top[:k]
        recall = len(relevant & set(top)) / len(relevant)
        rr = 0.0
        for rank, doc in enumerate(top, start=1):
            if doc in relevant:
                rr = 1 / rank
                break
        per_query.append((row["category"], recall, rr))

    def summarise(rows):
        return {"recall_at_k": round(sum(r for _, r, _ in rows) / len(rows), 3),
                "mrr": round(sum(m for _, _, m in rows) / len(rows), 3),
                "queries": len(rows)}

    by_category = {}
    for category in sorted({c for c, _, _ in per_query}):
        by_category[category] = summarise([q for q in per_query if q[0] == category])
    worst = min(by_category, key=lambda c: (by_category[c]["recall_at_k"], c)) if by_category else None
    return {"overall": summarise(per_query) if per_query else None, "by_category": by_category,
            "worst_category": worst, "unlabeled": unlabeled}
'''

# --- Stage 7: write a check that agrees with people -------------------------

IS_GROUNDED = r'''
REFUSALS = ("i couldn't find", "i could not find", "i don't know", "i do not know")


def is_grounded(trace):
    answer = trace["answer"]
    if any(phrase in answer.lower() for phrase in REFUSALS):
        return True
    retrieved = {doc["id"]: doc["text"] for doc in trace["retrieved"]}
    cited = re.findall(r"\[([a-z0-9-]+)\]", answer)
    if not cited or any(doc_id not in retrieved for doc_id in cited):
        return False
    sources = " ".join(retrieved[doc_id] for doc_id in cited)
    for claim in re.findall(r"\$\d+(?:\.\d+)?|\b\d+ (?:days?|hours?|business days?)\b", answer):
        if claim not in sources:
            return False
    return True
'''

# --- Stage 8: a judge you can trust ------------------------------------------

JUDGE = r'''
def judge(question, first, second):
    """The LLM judge, as it behaves in production (scripted so tests are exact):
    it prefers the clearly longer answer, and when the two are close in length
    it picks whichever one it saw first."""
    if len(second) > 1.2 * len(first):
        return "second"
    if len(first) > 1.2 * len(second):
        return "first"
    return "first"
'''

EVALUATE_JUDGE = r'''
def evaluate_judge(pairs):
    raw_agree = swapped_agree = flips = 0
    for pair in pairs:
        q, a, b, human = pair["question"], pair["a"], pair["b"], pair["human"]
        forward = "a" if judge(q, a, b) == "first" else "b"
        backward = "b" if judge(q, b, a) == "first" else "a"
        raw_agree += forward == human
        if forward != backward:
            flips += 1
            verdict = "tie"
        else:
            verdict = forward
        swapped_agree += verdict == human
    n = len(pairs)
    return {"raw_agreement": round(raw_agree / n, 3),
            "swap_checked_agreement": round(swapped_agree / n, 3),
            "position_flip_rate": round(flips / n, 3)}
'''

# --- Stage 9: will it hold 50 requests a second? -----------------------------

PLAN_CAPACITY = r'''
def plan_capacity(load, options, slo_p95_seconds, utilization=0.7, p95_factor=1.5):
    best = None
    for option in options:
        latency = (load["input_tokens"] / option["prefill_tokens_per_s"]
                   + load["output_tokens"] / option["decode_tokens_per_s"])
        if latency * p95_factor > slo_p95_seconds:
            continue
        in_flight = load["requests_per_s"] * latency
        replicas = max(1, math.ceil(in_flight / (option["max_concurrent"] * utilization)))
        monthly = round(replicas * option["cost_per_hour"] * 730, 2)
        candidate = {"option": option["name"], "replicas": replicas,
                     "p95_seconds": round(latency * p95_factor, 2), "monthly_cost": monthly}
        if best is None or (monthly, option["name"]) < (best["monthly_cost"], best["option"]):
            best = candidate
    return best
'''

# --- Stage 10: a document tells the bot to refund ----------------------------

AUTHORIZE = r'''
WRITE_TOOLS = {"issue_refund", "update_address"}
READ_TOOLS = {"lookup_order"}
APPROVAL_OVER = 100


def authorize(call, session):
    tool = call.get("tool")
    args = call.get("arguments") or {}
    if tool not in WRITE_TOOLS | READ_TOOLS:
        return {"decision": "deny", "reason": "unknown_tool"}
    if tool in WRITE_TOOLS and call.get("source") != "user":
        return {"decision": "deny", "reason": "untrusted_source"}
    order = session["orders"].get(args.get("order_id"))
    if order is None or order["customer"] != session["customer"]:
        return {"decision": "deny", "reason": "not_your_order"}
    if tool == "issue_refund":
        amount = args.get("amount")
        if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount <= 0:
            return {"decision": "deny", "reason": "invalid_amount"}
        if amount > order["total"] - order.get("refunded", 0):
            return {"decision": "deny", "reason": "exceeds_order_total"}
        if amount > APPROVAL_OVER:
            return {"decision": "needs_approval", "reason": "over_limit"}
    return {"decision": "allow", "reason": "ok"}
'''

# --- Stage 11: ship it or roll it back ---------------------------------------

CANARY_DECISION = r'''
def canary_decision(control, canary, min_requests=500, enough_requests=2000, z_threshold=2.33,
                    latency_ratio_limit=1.2):
    if canary["requests"] < min_requests:
        return {"decision": "keep_waiting", "z": None}
    p_control = control["errors"] / control["requests"]
    p_canary = canary["errors"] / canary["requests"]
    pooled = (control["errors"] + canary["errors"]) / (control["requests"] + canary["requests"])
    spread = math.sqrt(pooled * (1 - pooled) * (1 / control["requests"] + 1 / canary["requests"]))
    z = 0.0 if spread == 0 else (p_canary - p_control) / spread
    z = round(z, 2)
    if z > z_threshold:
        return {"decision": "rollback", "z": z}
    if canary["p95_ms"] > latency_ratio_limit * control["p95_ms"]:
        return {"decision": "rollback", "z": z}
    if canary["requests"] >= enough_requests:
        return {"decision": "promote", "z": z}
    return {"decision": "keep_waiting", "z": z}
'''

# --- Stage 12: the incident review --------------------------------------------

INCIDENT_REVIEW = r'''
def incident_review(deploys, lines):
    first = first_failure(lines)
    if first is None:
        return None
    failed_at = datetime.fromisoformat(first["time"].replace("Z", "+00:00"))
    history = sorted((d for d in deploys if d["service"] == first["service"]),
                     key=lambda d: datetime.fromisoformat(d["at"].replace("Z", "+00:00")))
    before = [d for d in history if datetime.fromisoformat(d["at"].replace("Z", "+00:00")) <= failed_at]
    affected = set()
    for line in lines:
        parts = line.split(" ")
        try:
            datetime.fromisoformat(parts[0].replace("Z", "+00:00"))
        except ValueError:
            continue
        fields = dict(p.partition("=")[::2] for p in parts[1:] if "=" in p)
        if fields.get("level") == "ERROR" and fields.get("req"):
            affected.add(fields["req"])
    return {"root_service": first["service"], "first_failure_at": first["time"],
            "trigger_deploy": before[-1]["id"] if before else None,
            "rollback_to": before[-2]["id"] if len(before) >= 2 else None,
            "affected_requests": len(affected)}
'''
