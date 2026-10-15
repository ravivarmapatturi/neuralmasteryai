"""Reference solutions for the Build-an-Agent track, as source strings.

They're strings (not live functions) because they're reused three ways:
executed by build.py to compute and check every test's expected output,
pasted into later stages' starter code as "provided from stage N", and
shown in each problem's collapsed "Reference solution" block.
"""

PARSE_TOOL_CALL = '''
def parse_tool_call(text):
    if '"tool"' not in text:
        return None  # no tool call -> this is the model's final answer
    fence = re.search(r"```(?:json)?\\s*(.*?)```", text, re.DOTALL)
    if fence:
        candidate = fence.group(1)
    else:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end < start:
            raise ValueError("tool call has no JSON object")
        candidate = text[start:end + 1]
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid JSON in tool call: {e.msg}")
    if not isinstance(data, dict) or not isinstance(data.get("tool"), str) or not data["tool"]:
        raise ValueError("tool call needs a non-empty string 'tool'")
    arguments = data.get("arguments", {})
    if not isinstance(arguments, dict):
        raise ValueError("'arguments' must be an object")
    return {"tool": data["tool"], "arguments": arguments}
'''

VALIDATE_ARGUMENTS = '''
JSON_TYPE_NAMES = {str: "string", bool: "boolean", int: "integer", float: "number",
                   list: "array", dict: "object", type(None): "null"}


def _matches(value, expected):
    if expected == "string":
        return isinstance(value, str)
    if expected == "boolean":
        return isinstance(value, bool)
    if expected == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if expected == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    return False


def validate_arguments(arguments, schema):
    errors = []
    properties = schema.get("properties", {})
    for name in schema.get("required", []):
        if name not in arguments:
            errors.append(f"missing required argument '{name}'")
    for name, value in arguments.items():
        if name not in properties:
            errors.append(f"unexpected argument '{name}'")
            continue
        expected = properties[name]["type"]
        if not _matches(value, expected):
            got = JSON_TYPE_NAMES.get(type(value), type(value).__name__)
            errors.append(f"argument '{name}' should be {expected}, got {got}")
    return errors
'''

DISPATCH = '''
def dispatch(call):
    name, arguments = call["tool"], call["arguments"]
    if name not in TOOLS:
        available = ", ".join(sorted(TOOLS))
        return f"error: unknown tool '{name}'. available tools: {available}"
    errors = validate_arguments(arguments, TOOLS[name]["schema"])
    if errors:
        return f"error: invalid arguments for '{name}': " + "; ".join(errors)
    try:
        result = TOOLS[name]["fn"](**arguments)
    except Exception as e:
        return f"error: {name} raised {type(e).__name__}: {e}"
    return result if isinstance(result, str) else json.dumps(result)
'''

RUN_AGENT_V1 = '''
def run_agent(task, script, max_steps=5):
    llm = make_llm(script)
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task}]
    tools_called = []
    for step in range(1, max_steps + 1):
        reply = llm(messages)
        messages.append({"role": "assistant", "content": reply})
        call = parse_tool_call(reply)
        if call is None:
            return {"answer": reply, "steps": step, "tools_called": tools_called,
                    "stop_reason": "final_answer"}
        tools_called.append(call["tool"])
        messages.append({"role": "tool", "content": dispatch(call)})
    return {"answer": None, "steps": max_steps, "tools_called": tools_called,
            "stop_reason": "max_steps"}
'''

RUN_AGENT_V2 = '''
def run_agent(task, script, max_steps=5, max_consecutive_errors=3):
    llm = make_llm(script)
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task}]
    tools_called = []
    errors = 0
    consecutive = 0
    for step in range(1, max_steps + 1):
        reply = llm(messages)
        messages.append({"role": "assistant", "content": reply})
        try:
            call = parse_tool_call(reply)
        except ValueError as e:
            errors += 1
            consecutive += 1
            messages.append({"role": "user", "content":
                f"error: could not parse your tool call ({e}). "
                "Reply with a JSON tool call or a final answer."})
        else:
            if call is None:
                return {"answer": reply, "steps": step, "tools_called": tools_called,
                        "errors": errors, "stop_reason": "final_answer"}
            tools_called.append(call["tool"])
            result = dispatch(call)
            messages.append({"role": "tool", "content": result})
            if result.startswith("error:"):
                errors += 1
                consecutive += 1
            else:
                consecutive = 0
        if consecutive >= max_consecutive_errors:
            return {"answer": None, "steps": step, "tools_called": tools_called,
                    "errors": errors, "stop_reason": "too_many_errors"}
    return {"answer": None, "steps": max_steps, "tools_called": tools_called,
            "errors": errors, "stop_reason": "max_steps"}
'''

RUN_AGENT_V3 = '''
def run_agent(task, script, max_steps=8, max_consecutive_errors=3, max_tokens=None):
    llm = make_llm(script)
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task}]
    tools_called = []
    errors = 0
    consecutive = 0
    recent_calls = []

    def result(answer, steps, reason):
        return {"answer": answer, "steps": steps, "tools_called": tools_called,
                "errors": errors, "stop_reason": reason,
                "context_tokens": sum(count_tokens(m["content"]) for m in messages)}

    for step in range(1, max_steps + 1):
        if max_tokens is not None and sum(count_tokens(m["content"]) for m in messages) > max_tokens:
            return result(None, step - 1, "token_budget")
        reply = llm(messages)
        messages.append({"role": "assistant", "content": reply})
        try:
            call = parse_tool_call(reply)
        except ValueError as e:
            errors += 1
            consecutive += 1
            messages.append({"role": "user", "content":
                f"error: could not parse your tool call ({e}). "
                "Reply with a JSON tool call or a final answer."})
        else:
            if call is None:
                return result(reply, step, "final_answer")
            signature = call["tool"] + json.dumps(call["arguments"], sort_keys=True)
            recent_calls.append(signature)
            if recent_calls[-3:] == [signature] * 3:
                return result(None, step, "loop_detected")
            tools_called.append(call["tool"])
            output = dispatch(call)
            messages.append({"role": "tool", "content": output})
            if output.startswith("error:"):
                errors += 1
                consecutive += 1
            else:
                consecutive = 0
        if consecutive >= max_consecutive_errors:
            return result(None, step, "too_many_errors")
    return result(None, max_steps, "max_steps")
'''

TRIM_MESSAGES = '''
def trim_messages(messages, max_tokens):
    # Pin the system prompt (if any) and the first user message: the task.
    pinned_count = 0
    if messages and messages[0]["role"] == "system":
        pinned_count = 1
    if len(messages) > pinned_count and messages[pinned_count]["role"] == "user":
        pinned_count += 1
    pinned, rest = messages[:pinned_count], messages[pinned_count:]

    # Group the rest so an assistant message and the tool results that
    # follow it are kept or dropped together.
    groups = []
    for m in rest:
        if m["role"] == "tool" and groups and groups[-1][0]["role"] == "assistant":
            groups[-1].append(m)
        else:
            groups.append([m])

    budget = max_tokens - sum(count_tokens(m["content"]) for m in pinned)
    kept = []
    for group in reversed(groups):
        cost = sum(count_tokens(m["content"]) for m in group)
        if cost > budget:
            break
        kept = group + kept
        budget -= cost
    return pinned + kept
'''

EXECUTE_TOOL_CALLS = '''
def execute_tool_calls(calls, max_parallel=4):
    results = []
    seen = set()
    for i, call in enumerate(calls, start=1):
        call_id = call.get("id") or f"call_{i}"
        if call_id in seen:
            content = f"error: duplicate tool_call_id '{call_id}'"
        elif i > max_parallel:
            content = f"error: too many parallel tool calls (limit {max_parallel})"
        else:
            content = dispatch({"tool": call["tool"], "arguments": call.get("arguments", {})})
        seen.add(call_id)
        results.append({"role": "tool", "tool_call_id": call_id, "content": content})
    return results
'''

RECALL = '''
STOPWORDS = {"a", "an", "and", "are", "did", "do", "does", "for", "i", "in", "is",
             "it", "me", "my", "of", "on", "the", "to", "was", "what", "when",
             "where", "which", "who", "with", "you", "your"}


def _terms(text):
    return {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 1 and w not in STOPWORDS}


def recall(memories, query, k=3):
    query_terms = _terms(query)
    scored = []
    for m in memories:
        score = len(query_terms & _terms(m["text"]))
        if score > 0:
            scored.append((-score, -m["turn"], m["id"]))
    scored.sort()
    return [memory_id for _, _, memory_id in scored[:k]]
'''

EXECUTE_PLAN = '''
def execute_plan(plan):
    by_id = {}
    for step in plan:
        if step["id"] in by_id:
            raise ValueError(f"duplicate step id {step['id']}")
        by_id[step["id"]] = step
    for step in plan:
        for dep in step.get("depends_on", []):
            if dep not in by_id:
                raise ValueError(f"step {step['id']} depends on unknown step {dep}")

    # Kahn's algorithm; among ready steps, keep the plan's own order.
    remaining = {s["id"]: set(s.get("depends_on", [])) for s in plan}
    order = []
    while remaining:
        ready = [s["id"] for s in plan if s["id"] in remaining and not remaining[s["id"]]]
        if not ready:
            raise ValueError("plan has a dependency cycle")
        nxt = ready[0]
        order.append(nxt)
        del remaining[nxt]
        for deps in remaining.values():
            deps.discard(nxt)

    results = {}
    for step_id in order:
        step = by_id[step_id]
        if any(results[d]["status"] != "ok" for d in step.get("depends_on", [])):
            results[step_id] = {"status": "skipped", "output": None}
            continue
        arguments = {}
        for name, value in step.get("arguments", {}).items():
            if isinstance(value, str) and value.startswith("$") and value[1:] in by_id:
                raw = results[value[1:]]["output"]
                try:
                    value = json.loads(raw)
                except ValueError:
                    value = raw
            arguments[name] = value
        output = dispatch({"tool": step["tool"], "arguments": arguments})
        status = "error" if output.startswith("error:") else "ok"
        results[step_id] = {"status": status, "output": output}
    return {"order": order, "results": results}
'''

EVALUATE_AGENT = '''
def evaluate_agent(cases):
    if not cases:
        raise ValueError("need at least one eval case")
    passed = 0
    right_tools = 0
    total_steps = 0
    failures = {}
    for case in cases:
        run = run_agent(case["task"], case["script"], max_steps=case.get("max_steps", 8))
        total_steps += run["steps"]
        tools_ok = run["tools_called"] == case["expected_tools"]
        right_tools += tools_ok
        if run["answer"] is None:
            failures[case["name"]] = "no_answer:" + run["stop_reason"]
        elif not tools_ok:
            failures[case["name"]] = "wrong_tools"
        elif case["expected_answer_contains"].lower() not in run["answer"].lower():
            failures[case["name"]] = "wrong_answer"
        else:
            passed += 1
    n = len(cases)
    return {"pass_rate": round(passed / n, 3), "tool_accuracy": round(right_tools / n, 3),
            "avg_steps": round(total_steps / n, 2), "failures": failures}
'''

CAPSTONE = '''
def parse_reply(text):
    """Return None (final answer) or a list of calls [{"id", "tool", "arguments"}]."""
    if '"tool' not in text:
        return None
    fence = re.search(r"```(?:json)?\\s*(.*?)```", text, re.DOTALL)
    if fence:
        candidate = fence.group(1)
    else:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end < start:
            raise ValueError("tool call has no JSON object")
        candidate = text[start:end + 1]
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError as e:
        raise ValueError(f"invalid JSON in tool call: {e.msg}")
    if isinstance(data, dict) and isinstance(data.get("tool_calls"), list):
        raw_calls = data["tool_calls"]
    elif isinstance(data, dict):
        raw_calls = [data]
    else:
        raise ValueError("tool call must be a JSON object")
    calls = []
    for raw in raw_calls:
        if not isinstance(raw, dict) or not isinstance(raw.get("tool"), str) or not raw["tool"]:
            raise ValueError("tool call needs a non-empty string 'tool'")
        if not isinstance(raw.get("arguments", {}), dict):
            raise ValueError("'arguments' must be an object")
        calls.append({"id": raw.get("id"), "tool": raw["tool"], "arguments": raw.get("arguments", {})})
    return calls


def run_agent_v2(task, script, config):
    max_steps = config.get("max_steps", 8)
    max_errors = config.get("max_consecutive_errors", 3)
    max_tokens = config.get("max_tokens")
    context_limit = config.get("context_limit")
    llm = make_llm(script)
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task}]
    tools_called, recent, trace = [], [], []
    errors = consecutive = 0
    total_tokens = 0

    def finish(answer, steps, reason):
        return {"answer": answer, "steps": steps, "stop_reason": reason,
                "tools_called": tools_called, "errors": errors, "trace": trace}

    for step in range(1, max_steps + 1):
        context = trim_messages(messages, context_limit) if context_limit else messages
        cost = sum(count_tokens(m["content"]) for m in context)
        if max_tokens is not None and total_tokens + cost > max_tokens:
            return finish(None, step - 1, "token_budget")
        total_tokens += cost
        reply = llm(context)
        messages.append({"role": "assistant", "content": reply})
        try:
            calls = parse_reply(reply)
        except ValueError as e:
            errors += 1
            consecutive += 1
            trace.append({"step": step, "action": "parse_error"})
            messages.append({"role": "user", "content":
                f"error: could not parse your tool call ({e}). "
                "Reply with a JSON tool call or a final answer."})
        else:
            if calls is None:
                trace.append({"step": step, "action": "final_answer"})
                return finish(reply, step, "final_answer")
            signature = json.dumps([[c["tool"], c["arguments"]] for c in calls], sort_keys=True)
            recent.append(signature)
            if recent[-3:] == [signature] * 3:
                trace.append({"step": step, "action": "loop_detected"})
                return finish(None, step, "loop_detected")
            results = execute_tool_calls(calls)
            step_errors = 0
            for call, res in zip(calls, results):
                tools_called.append(call["tool"])
                messages.append(res)
                if res["content"].startswith("error:"):
                    step_errors += 1
            errors += step_errors
            consecutive = consecutive + 1 if step_errors == len(results) else 0
            trace.append({"step": step, "action": "tools",
                          "tools": [c["tool"] for c in calls], "failed": step_errors})
        if consecutive >= max_errors:
            return finish(None, step, "too_many_errors")
    return finish(None, max_steps, "max_steps")
'''
