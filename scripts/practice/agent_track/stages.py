"""The 12 stages of the "Build an Agent" track -- prose, starter code and tests.

Every stage is one piece of a real tool-using agent, and each starter
contains the reference code of the stages before it, so by stage 12 the
learner has assembled (and understands) a complete production-style loop:
parse -> validate -> dispatch -> loop -> recover -> guard -> trim ->
parallel calls -> memory -> plans -> evals -> capstone.

`expect` on a test pins the intended answer by hand; build.py fails if the
reference solution disagrees. Tests without `expect` take the reference
solution's output (after build.py has run it).
"""

from solutions import (CAPSTONE, DISPATCH, EVALUATE_AGENT, EXECUTE_PLAN, EXECUTE_TOOL_CALLS,
                       PARSE_TOOL_CALL, RECALL, RUN_AGENT_V1, RUN_AGENT_V2, RUN_AGENT_V3,
                       TRIM_MESSAGES, VALIDATE_ARGUMENTS)


def T(id, label, input, hidden=False, desc=None, expect=None, error=None, raw_expect=False):
    return {"id": id, "label": label, "input": input, "hidden": hidden, "description": desc,
            "expect": expect, "error": error, "has_expect": raw_expect or expect is not None}


def call(tool, **arguments):
    import json
    return json.dumps({"tool": tool, "arguments": arguments})


W_PARIS = call("get_weather", city="Paris")
W_TOKYO = call("get_weather", city="Tokyo")
W_LIMA = call("get_weather", city="Lima")
ADD_1_2 = call("add", a=1, b=2)
BAD_JSON = '{"tool": "add", "arguments": {"a": 1,}}'
UNKNOWN = call("search_web", query="cheap flights")

LEARN_REACT = {"title": "ReAct agents in production", "route": "/docs/agents/react-agent-production",
               "description": "The Thought → Action → Observation loop, the tool-calling contract and parse-failure recovery."}
LEARN_FUNDAMENTALS = {"title": "Agent fundamentals: tool use", "route": "/docs/agents/agent-fundamentals",
                      "description": "What makes something an agent, and how function calling actually works."}
LEARN_CONTEXT = {"title": "Context engineering", "route": "/docs/agents/context-engineering",
                 "description": "Deciding what the model sees on every call, and what gets cut."}
LEARN_PLAN = {"title": "Plan-and-execute agents", "route": "/docs/agents/plan-and-execute",
              "description": "Plan once, execute many: when it beats ReAct and when it loses."}
LEARN_LOOPS = {"title": "Loops and graphs", "route": "/docs/agents/loops-and-graphs",
               "description": "Why a while-loop agent becomes a graph, and which edges are real."}
LEARN_EVAL = {"title": "Evaluating LLM, RAG and agent systems", "route": "/docs/ai-evaluation/llm-rag-agent-evaluation",
              "description": "Task success, tool-call accuracy and trajectory metrics for agents."}

STAGES = []

# ---------------------------------------------------------------------------
STAGES.append(dict(
    n=1, id="agent-parse-tool-call", title="Parse a Tool Call From Model Output",
    difficulty="easy", time="10–15 min", function="parse_tool_call",
    signature="parse_tool_call(text: str) -> dict | None",
    provided=[], needs_llm=False,
    mission="Every agent starts here: the model replies with text, and your code has to decide whether that text is a tool call or a final answer. Real models wrap JSON in prose and code fences, so a naive json.loads crashes on day one.",
    task="""Implement `parse_tool_call(text)`.

- If `text` does not contain the substring `"tool"` (with the double quotes), it's a final answer: return `None`.
- Otherwise find the JSON: if the text has a fenced code block (three backticks, optionally tagged json), use the fence's contents. If not, use everything from the first `{` to the last `}`.
- Parse it. Return `{"tool": name, "arguments": args}`. A missing `arguments` key means `{}`.
- Raise `ValueError` (not json's own JSONDecodeError) when the JSON is invalid, when `tool` is missing or empty, or when `arguments` isn't an object.""",
    constraints=["Standard library only (`json` and `re` are already imported).",
                 "Raise exactly `ValueError` -- the agent loop in stage 5 catches that one type.",
                 "Hidden tests cover fences, missing arguments and malformed JSON."],
    hints=dict(
        small="Check for the final-answer case first. Then work out which slice of the text to hand to json.loads.",
        strong="re.search(r\"```(?:json)?\\s*(.*?)```\", text, re.DOTALL) finds a fence. Wrap json.loads in try/except json.JSONDecodeError and re-raise as ValueError.",
        concept="Parsing is the trust boundary between a probabilistic model and deterministic code. Be strict, and make every failure the same predictable type."),
    connections=[LEARN_REACT, LEARN_FUNDAMENTALS],
    stub='''def parse_tool_call(text):
    """Return {"tool": str, "arguments": dict} for a tool call, None for a final answer.
    Raise ValueError for a malformed tool call."""
    # Your code here
    pass
''',
    solution=PARSE_TOOL_CALL,
    tests=[
        T("plain-json", "Bare JSON tool call", {"text": W_PARIS},
          expect={"tool": "get_weather", "arguments": {"city": "Paris"}}),
        T("prose-before", "Model thinks out loud before the JSON",
          {"text": "Let me check the forecast first.\n" + W_TOKYO},
          expect={"tool": "get_weather", "arguments": {"city": "Tokyo"}}),
        T("final-answer", "No tool call means a final answer", {"text": "It is 18C and raining in Paris."},
          expect=None, raw_expect=True),
        T("fenced", "JSON inside a ```json fence",
          {"text": "Sure!\n```json\n" + call("add", a=2, b=3) + "\n```"},
          expect={"tool": "add", "arguments": {"a": 2, "b": 3}}),
        T("no-arguments", "Missing arguments defaults to {}", {"text": '{"tool": "lookup_doc"}'}, hidden=True,
          expect={"tool": "lookup_doc", "arguments": {}}),
        T("trailing-comma", "Malformed JSON raises ValueError", {"text": BAD_JSON}, hidden=True, error="ValueError"),
        T("arguments-list", "arguments must be an object", {"text": '{"tool": "add", "arguments": [1, 2]}'},
          hidden=True, error="ValueError"),
        T("empty-tool", "Empty tool name raises ValueError", {"text": '{"tool": "", "arguments": {}}'},
          hidden=True, error="ValueError"),
        T("fence-wins", "A fence wins over braces in the surrounding prose",
          {"text": "```\n" + call("divide", a=1, b=4) + "\n```\nI will divide {a} by {b}."}, hidden=True,
          expect={"tool": "divide", "arguments": {"a": 1, "b": 4}}),
    ],
    intuition="""
## The job: text in, decision out

The first piece of an agent: a **parser** that turns a model reply into either "call this tool with these arguments" or "here's my final answer".

```text
model reply
  └─► parse_tool_call(reply)
        ├─ {"tool": ..., "arguments": ...}  → run a tool
        ├─ None                             → final answer
        └─ raises ValueError                → model slipped
```

## Extract first, then parse

Real models don't return clean JSON. You'll see all three of these on the same day:

```text
{"tool": "get_weather", "arguments": {...}}

Let me check the forecast first.
{"tool": "get_weather", ...}

Sure! ```json {"tool": "add", ...} ```
```

So the parser extracts first and parses second. Fences are the strongest signal, so check for them first. Otherwise take the outermost braces.

## This is the agent's trust boundary

This function is the trust boundary of the whole agent. Everything after it (validation, dispatch, the loop) assumes it gets a well-formed dict. If something is malformed, it has to fail **loudly and in one predictable way**, so the loop can catch that one exception type and recover. That's stage 5.

## Where text parsing breaks down

String-sniffing JSON out of prose is fragile. A final answer that quotes the word `"tool"` would be mistaken for a call. That's why the big model APIs moved to **native tool calling**: the model emits a structured `tool_use` block and nobody parses text. You still need this skill, though. Open-weights models, older endpoints and "JSON mode" fallbacks all hand you text.

> **Remember:** extract, then parse, then validate the shape, and raise one exception type for every failure.

Next: the dict you return can still have the *wrong arguments*. Stage 2 checks them against the tool's schema before anything runs.
"""))

# ---------------------------------------------------------------------------
WEATHER_SCHEMA = {"type": "object", "properties": {"city": {"type": "string"}, "units": {"type": "string"}},
                  "required": ["city"]}
ADD_SCHEMA = {"type": "object", "properties": {"a": {"type": "number"}, "b": {"type": "number"}},
              "required": ["a", "b"]}
MIXED_SCHEMA = {"type": "object", "properties": {"k": {"type": "integer"}, "flags": {"type": "array"},
                                                 "verbose": {"type": "boolean"}}, "required": ["k"]}
STAGES.append(dict(
    n=2, id="agent-validate-tool-arguments", title="Validate Tool Arguments Against a Schema",
    difficulty="easy", time="10–15 min", function="validate_arguments",
    signature="validate_arguments(arguments: dict, schema: dict) -> list[str]",
    provided=[], needs_llm=False,
    mission="Models hallucinate arguments: wrong types, missing fields, extra fields they made up. Check them against the tool's JSON Schema before you run anything, and produce error messages clear enough for the model to fix its own call.",
    task="""Implement `validate_arguments(arguments, schema)`. It returns a list of error strings, and `[]` means valid.

`schema` looks like `{"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}`. Supported types are `string`, `number` (int or float), `integer`, `boolean`, `array` and `object`.

Produce errors in this order:
1. For each name in `required` order that's missing: `missing required argument 'city'`
2. Then for each argument, in the order it appears in `arguments`:
   - not in `properties`: `unexpected argument 'units'`
   - wrong type: `argument 'a' should be number, got string`

Name the received type in JSON terms: string, boolean, integer, number, array, object or null.""",
    constraints=["Watch out: in Python `True` is an `int`. A boolean is never a valid number or integer.",
                 "An `int` is a valid `number`, but a float is not a valid `integer`.",
                 "Error strings must match exactly, because the model reads them in stage 3."],
    hints=dict(
        small="Do two passes: required names first, then the arguments the model actually sent.",
        strong="Use isinstance(value, bool) checks before int checks. Map Python types to JSON names with a dict: {str: 'string', bool: 'boolean', int: 'integer', float: 'number', list: 'array', dict: 'object', type(None): 'null'}.",
        concept="Validation errors are the model's feedback channel. Precise messages ('should be number, got string') let it self-correct on the next turn."),
    connections=[LEARN_FUNDAMENTALS, LEARN_REACT],
    stub='''def validate_arguments(arguments, schema):
    """Return a list of human-readable error strings ([] if the arguments are valid)."""
    # Your code here
    pass
''',
    solution=VALIDATE_ARGUMENTS,
    tests=[
        T("valid", "Valid arguments", {"arguments": {"city": "Paris"}, "schema": WEATHER_SCHEMA}, expect=[]),
        T("missing", "Missing required argument", {"arguments": {}, "schema": WEATHER_SCHEMA},
          expect=["missing required argument 'city'"]),
        T("wrong-type", "String where a number is required", {"arguments": {"a": "2", "b": 3}, "schema": ADD_SCHEMA},
          expect=["argument 'a' should be number, got string"]),
        T("unexpected", "Hallucinated extra argument", {"arguments": {"city": "Lima", "country": "PE"}, "schema": WEATHER_SCHEMA},
          expect=["unexpected argument 'country'"]),
        T("int-is-number", "An int is a valid number", {"arguments": {"a": 2, "b": 3.5}, "schema": ADD_SCHEMA},
          hidden=True, expect=[]),
        T("bool-not-number", "True is not a number", {"arguments": {"a": True, "b": 1}, "schema": ADD_SCHEMA},
          hidden=True, expect=["argument 'a' should be number, got boolean"]),
        T("ordering", "Several errors in the specified order", {"arguments": {"b": "x", "c": 1}, "schema": ADD_SCHEMA},
          hidden=True, expect=["missing required argument 'a'", "argument 'b' should be number, got string",
                               "unexpected argument 'c'"]),
        T("null", "null is reported as null", {"arguments": {"city": None}, "schema": WEATHER_SCHEMA},
          hidden=True, expect=["argument 'city' should be string, got null"]),
        T("integer-array-boolean", "integer, array and boolean types",
          {"arguments": {"k": 2.5, "flags": "a,b", "verbose": True}, "schema": MIXED_SCHEMA}, hidden=True,
          expect=["argument 'k' should be integer, got number", "argument 'flags' should be array, got string"]),
    ],
    intuition="""
## A schema check before anything runs

A tiny JSON Schema validator: the check that runs **between** "the model asked for a tool" and "we actually run it".

## Two passes, and the bool trap

Tool definitions you send to a model include a schema like this:

```json
{"type": "object",
 "properties": {"a": {"type": "number"},
                "b": {"type": "number"}},
 "required": ["a", "b"]}
```

The model is *supposed* to follow it. It often doesn't. Validation is two passes:

1. **Required:** is every required name present?
2. **Sent:** is every argument the model sent a known property, with the right type?

The classic Python trap is `isinstance(True, int)`, which is `True`. If the model sends `{"a": true}`, a naive check calls it a number and your calculator returns `2` for `true + 1`. Check `bool` first.

## Error messages are written for the model

When you return a bad call to the model as a **specific** error, it can fix the call on its next turn:

```text
tool:  error: invalid arguments for 'add':
       argument 'a' should be number, got string
model: {"tool": "add",
        "arguments": {"a": 2, "b": 3}}
```

Vague errors ("bad input") make models retry the same mistake. That's how loops start, and stage 6 catches them.

## What this validator doesn't cover

This handles flat schemas. Real JSON Schema also has nested objects, enums, min/max, patterns and `anyOf`. In production you'd use a library (`jsonschema`, Pydantic), or the provider's own **strict / structured outputs** mode, which constrains decoding so invalid arguments can't be produced in the first place.

> **Remember:** never execute an unvalidated tool call, and write every error message for the model to read.

Next: stage 3 puts parse + validate + execute together in a dispatcher that **never crashes the agent**.
"""))

# ---------------------------------------------------------------------------
STAGES.append(dict(
    n=3, id="agent-dispatch-tools", title="Dispatch Tool Calls Without Crashing the Agent",
    difficulty="easy", time="10–15 min", function="dispatch",
    signature="dispatch(call: dict) -> str",
    provided=[("Stage 2: validate_arguments", VALIDATE_ARGUMENTS)], needs_llm=False,
    mission="Tools fail all the time: a city with no data, a divide by zero, a tool name the model invented. A production dispatcher turns every one of those into an observation the model can read. It never raises one that kills the run.",
    task="""Implement `dispatch(call)`, where `call` is `{"tool": name, "arguments": {...}}` (what stage 1 returns). Look the tool up in the provided `TOOLS` registry and always return a **string**:

- Unknown tool: `error: unknown tool 'NAME'. available tools: add, divide, get_weather, lookup_doc` (names sorted, comma-separated)
- Invalid arguments (use your stage-2 `validate_arguments`, provided below): `error: invalid arguments for 'NAME': ` followed by the errors joined with `; `
- The tool raises: `error: NAME raised ExceptionType: message`
- Success: the result itself if it's a string, otherwise `json.dumps(result)`""",
    constraints=["Never let an exception escape `dispatch`.",
                 "Every return value is a `str`: the model only reads text.",
                 "`TOOLS[name]` is `{\"fn\": callable, \"schema\": dict}`, so call it as `fn(**arguments)`."],
    hints=dict(
        small="There are three ways to fail before success: unknown name, bad arguments, and an exception at run time. Handle them in that order.",
        strong="f\"error: {name} raised {type(e).__name__}: {e}\" inside `except Exception as e:`. Use json.dumps for non-string results, so 5 becomes \"5\" and 0.25 becomes \"0.25\".",
        concept="An observation that says 'this failed, here's why' is useful context for the model. A crashed process is nothing at all."),
    connections=[LEARN_REACT, LEARN_FUNDAMENTALS],
    stub='''def dispatch(call):
    """Run call["tool"] with call["arguments"]; always return a string observation."""
    # Your code here
    pass
''',
    solution=DISPATCH,
    tests=[
        T("add", "Numeric result is serialized", {"call": {"tool": "add", "arguments": {"a": 2, "b": 3}}}, expect="5"),
        T("weather", "String result is returned as-is", {"call": {"tool": "get_weather", "arguments": {"city": "Paris"}}},
          expect="18C, light rain"),
        T("unknown", "Hallucinated tool name", {"call": {"tool": "search_web", "arguments": {"query": "x"}}},
          expect="error: unknown tool 'search_web'. available tools: add, divide, get_weather, lookup_doc"),
        T("zero-division", "A tool that raises", {"call": {"tool": "divide", "arguments": {"a": 1, "b": 0}}},
          expect="error: divide raised ZeroDivisionError: division by zero"),
        T("invalid-args", "Arguments fail validation", {"call": {"tool": "add", "arguments": {"a": "two", "b": 3}}},
          hidden=True, expect="error: invalid arguments for 'add': argument 'a' should be number, got string"),
        T("value-error", "Tool raises ValueError", {"call": {"tool": "get_weather", "arguments": {"city": "Atlantis"}}},
          hidden=True, expect="error: get_weather raised ValueError: no weather data for Atlantis"),
        T("float", "Float result", {"call": {"tool": "divide", "arguments": {"a": 1, "b": 4}}}, hidden=True, expect="0.25"),
        T("missing-arg", "Missing argument is caught before running",
          {"call": {"tool": "lookup_doc", "arguments": {}}}, hidden=True,
          expect="error: invalid arguments for 'lookup_doc': missing required argument 'doc_id'"),
        T("multi-errors", "Multiple validation errors joined with '; '",
          {"call": {"tool": "add", "arguments": {"a": True}}}, hidden=True,
          expect="error: invalid arguments for 'add': missing required argument 'b'; argument 'a' should be number, got boolean"),
    ],
    intuition="""
## One function, four outcomes

The **dispatcher**: the one function that turns a parsed tool call into a string the model will read next.

```text
dispatch({"tool": "divide", ...})
  ├─ unknown tool?     → "error: unknown tool ..."
  ├─ bad arguments?    → "error: invalid arguments ..."
  ├─ tool raised?      → "error: divide raised
  │                        ZeroDivisionError: ..."
  └─ success           → "0.25"
```

## Everything comes back as a string

Everything comes back as a **string**, because the model only reads text. Listing the available tools in the "unknown tool" error is deliberate: the model asked for something that doesn't exist, so you give it the menu.

## Failures are normal in a real run

In a real agent run, tool failures are normal. APIs time out, rows don't exist, users ask about Atlantis. If one exception escapes, the whole run dies and the user gets a stack trace. When the failure comes back as an observation, the model can apologise, retry with different arguments, or try another tool. Anthropic's and OpenAI's tool-use docs both recommend returning errors to the model (with an `is_error` flag) rather than raising.

## Not every error should reach the model

`except Exception` is a blunt tool. In production you'd separate **retryable** errors (timeouts, rate limits), which you retry with backoff *before* the model sees them, from **semantic** errors (bad city), which go to the model. You'd also put timeouts and permission checks around tools that touch the outside world.

> **Remember:** the dispatcher's contract is "always returns a string". Every failure becomes information for the model.

Next: you have parse, validate and dispatch. Stage 4 wires them into the actual **agent loop**.
"""))

# ---------------------------------------------------------------------------
STAGES.append(dict(
    n=4, id="agent-loop", title="The Agent Loop",
    difficulty="medium", time="15–20 min", function="run_agent",
    signature="run_agent(task: str, script: list[str], max_steps: int = 5) -> dict",
    provided=[("Stage 1: parse_tool_call", PARSE_TOOL_CALL), ("Stage 2: validate_arguments", VALIDATE_ARGUMENTS),
              ("Stage 3: dispatch", DISPATCH)], needs_llm=True,
    mission="This is the loop behind ReAct, Claude Code and every 'agent' framework: ask the model, run the tool it picks, append the result, ask again, and stop when it answers. It's only about 15 lines, and the details are what separate a working agent from one that answers with stale or invented data.",
    task="""Implement `run_agent(task, script, max_steps=5)`.

1. Create the model with `llm = make_llm(script)` (provided). It's a scripted stand-in for a real model.
2. Start `messages` as `[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": task}]`.
3. Each step: `reply = llm(messages)`, then append `{"role": "assistant", "content": reply}`.
   - `parse_tool_call(reply)` is `None`: return `{"answer": reply, "steps": step, "tools_called": [...], "stop_reason": "final_answer"}`
   - Otherwise record the tool name, run `dispatch(call)`, and append `{"role": "tool", "content": result}`.
4. If `max_steps` model calls go by without a final answer, return `{"answer": None, "steps": max_steps, "tools_called": [...], "stop_reason": "max_steps"}`.

Steps count from 1. In this stage you can assume every tool call parses.""",
    constraints=["Feed every tool result back as a `tool` message. The scripted model fills `{last_tool_result}` from what you actually sent it.",
                 "Call the model exactly once per step. It raises if you call it more often than the script allows.",
                 "`tools_called` lists tool names in call order, including calls that returned errors."],
    hints=dict(
        small="for step in range(1, max_steps + 1): call the model, append its reply, then either return or run a tool and append the result.",
        strong="The answer test fails if you forget messages.append({\"role\": \"tool\", \"content\": dispatch(call)}): the model never 'sees' the weather, so its reply comes back with an empty value.",
        concept="An agent is a loop where the model decides the control flow. Your code only enforces the contract and the stopping conditions."),
    connections=[LEARN_REACT, LEARN_LOOPS],
    stub='''def run_agent(task, script, max_steps=5):
    """Run the model/tool loop until a final answer or max_steps."""
    llm = make_llm(script)
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task}]
    tools_called = []
    # Your loop here
    pass
''',
    solution=RUN_AGENT_V1,
    tests=[
        T("direct-answer", "Model answers without tools",
          {"task": "What is the capital of France?", "script": ["Paris is the capital of France."]},
          expect={"answer": "Paris is the capital of France.", "steps": 1, "tools_called": [], "stop_reason": "final_answer"}),
        T("one-tool", "One tool call, then an answer that uses its result",
          {"task": "Weather in Paris?", "script": [W_PARIS, "Right now Paris is {last_tool_result}."]},
          expect={"answer": "Right now Paris is 18C, light rain.", "steps": 2, "tools_called": ["get_weather"],
                  "stop_reason": "final_answer"}),
        T("max-steps", "Model never answers: stop at max_steps",
          {"task": "Weather?", "script": [W_PARIS, W_TOKYO, W_LIMA], "max_steps": 2},
          expect={"answer": None, "steps": 2, "tools_called": ["get_weather", "get_weather"], "stop_reason": "max_steps"}),
        T("tool-error-fed-back", "Tool errors are observations too",
          {"task": "Weather in Atlantis?", "script": [call("get_weather", city="Atlantis"), "Sorry: {last_tool_result}"]},
          expect={"answer": "Sorry: error: get_weather raised ValueError: no weather data for Atlantis", "steps": 2,
                  "tools_called": ["get_weather"], "stop_reason": "final_answer"}),
        T("latest-result", "The model sees the latest result, not the first",
          {"task": "Paris and Tokyo?", "script": [W_PARIS, W_TOKYO, "Tokyo: {last_tool_result}"]}, hidden=True,
          expect={"answer": "Tokyo: 24C, clear", "steps": 3, "tools_called": ["get_weather", "get_weather"],
                  "stop_reason": "final_answer"}),
        T("one-step", "max_steps=1 with a tool call", {"task": "2+3?", "script": [call("add", a=2, b=3)], "max_steps": 1},
          hidden=True, expect={"answer": None, "steps": 1, "tools_called": ["add"], "stop_reason": "max_steps"}),
        T("fenced-call", "Fenced tool call inside the loop",
          {"task": "Shipping time?", "script": ["Checking.\n```json\n" + call("lookup_doc", doc_id="shipping") + "\n```",
                                                  "{last_tool_result}"]}, hidden=True,
          expect={"answer": "Standard shipping takes 3-5 business days.", "steps": 2, "tools_called": ["lookup_doc"],
                  "stop_reason": "final_answer"}),
        T("three-tools", "Chained calls",
          {"task": "Do some maths", "script": [call("add", a=2, b=3), call("divide", a=10, b=4), ADD_1_2, "Last: {last_tool_result}"]},
          hidden=True, expect={"answer": "Last: 3", "steps": 4, "tools_called": ["add", "divide", "add"],
                               "stop_reason": "final_answer"}),
    ],
    intuition="""
## The fifteen lines inside every agent

The loop itself. Everything from stages 1–3 plugs in here:

```text
messages = [system, user task]
repeat up to max_steps:
    reply = llm(messages)                 ← the model decides what happens next
    messages += assistant(reply)
    call = parse_tool_call(reply)         ← stage 1
    if call is None: return reply         ← final answer
    messages += tool(dispatch(call))      ← stages 2 + 3
give up: max_steps
```

## The model is stateless

The model is **stateless**. It sees only the `messages` list you send on that call. So "the agent remembers the weather" really means "your loop appended the tool result, and the model read it on the next call." The scripted model in this sandbox enforces exactly that: `{last_tool_result}` in its reply is filled from the messages it actually received. Forget to append the result and the answer comes back with nothing in that slot.

This is the **ReAct** pattern (Reason + Act, Yao et al. 2022): think, act, observe, repeat. Modern tool-calling APIs drop the explicit "Thought:" text, but the control flow is the same loop.

## Frameworks are this loop plus plumbing

This loop is what's inside Claude Code, the OpenAI Agents SDK, LangGraph's prebuilt ReAct agent and smolagents. Once you've written it, the frameworks stop looking like magic. They add state, persistence and nicer tool registration around these lines.

## Three ways this loop still fails

This loop trusts the model completely. One malformed reply and `parse_tool_call` raises straight through your loop. A model that keeps calling the same tool will burn every step. There's no limit on how big `messages` grows. The next three stages fix exactly those three failures.

> **Remember:** the model only knows what's in `messages`. Your loop's job is to keep that list honest, and to stop.

Next: stage 5 makes the loop survive bad replies instead of crashing.
"""))

# ---------------------------------------------------------------------------
STAGES.append(dict(
    n=5, id="agent-error-recovery", title="Recover From Malformed and Failing Tool Calls",
    difficulty="medium", time="15–20 min", function="run_agent",
    signature="run_agent(task, script, max_steps=5, max_consecutive_errors=3) -> dict",
    provided=[("Stage 1: parse_tool_call", PARSE_TOOL_CALL), ("Stage 2: validate_arguments", VALIDATE_ARGUMENTS),
              ("Stage 3: dispatch", DISPATCH)], needs_llm=True,
    mission="Your stage-4 loop crashes the first time the model emits broken JSON, and production models do that a few times in every thousand calls. Feed the error back so the model can fix itself, but give up on a model that keeps failing.",
    task="""The starter code is your stage-4 loop. Extend it:

- If `parse_tool_call` raises `ValueError` as `e`, don't crash. Append `{"role": "user", "content": f"error: could not parse your tool call ({e}). Reply with a JSON tool call or a final answer."}` and continue to the next step.
- A dispatch result that starts with `error:` also counts as an error.
- Track `errors` (total) and consecutive errors. A successful tool result resets the consecutive count to 0.
- After a step, if consecutive errors reach `max_consecutive_errors`, return with `"stop_reason": "too_many_errors"` and `"steps"` set to the current step.
- Every returned dict now also includes `"errors"`, the total error count.""",
    constraints=["Use the exact feedback message above. The scripted model echoes it back via `{last_feedback}`.",
                 "A parse error doesn't add anything to `tools_called`, but a tool that returns an error does.",
                 "`max_steps` still applies, and a final answer still wins immediately."],
    hints=dict(
        small="Wrap the parse in try/except ValueError. Use try/except/else so the success path stays readable.",
        strong="Keep two counters. errors only goes up. consecutive goes up on any error and resets to 0 on a non-error tool result. Check `consecutive >= max_consecutive_errors` at the end of each step.",
        concept="Self-correction works because the error message is in context on the next call. A circuit breaker stops a model that can't self-correct from wasting money."),
    connections=[LEARN_REACT],
    stub=RUN_AGENT_V1.strip() + '''
# TODO (stage 5):
#   - catch ValueError from parse_tool_call and feed the error back as a user message
#   - count errors (parse errors + tool results starting with "error:")
#   - stop with "too_many_errors" after max_consecutive_errors in a row
#   - add "errors" to every returned dict, and accept max_consecutive_errors=3
''',
    solution=RUN_AGENT_V2,
    tests=[
        T("recovers", "Recovers from malformed JSON",
          {"task": "1+2?", "script": [BAD_JSON, ADD_1_2, "The sum is {last_tool_result}."]},
          expect={"answer": "The sum is 3.", "steps": 3, "tools_called": ["add"], "errors": 1, "stop_reason": "final_answer"}),
        T("feedback-visible", "The model receives your error message",
          {"task": "1+2?", "script": ['{"tool": "add" "arguments": {}}', "I saw: {last_feedback}"]}),
        T("circuit-breaker", "Three failures in a row stops the run",
          {"task": "Find flights", "script": [UNKNOWN, UNKNOWN, UNKNOWN, "never reached"]},
          expect={"answer": None, "steps": 3, "tools_called": ["search_web", "search_web", "search_web"], "errors": 3,
                  "stop_reason": "too_many_errors"}),
        T("reset", "A success resets the consecutive count",
          {"task": "maths", "script": [BAD_JSON, BAD_JSON, ADD_1_2, BAD_JSON, BAD_JSON, "done"], "max_steps": 8},
          expect={"answer": "done", "steps": 6, "tools_called": ["add"], "errors": 4, "stop_reason": "final_answer"}),
        T("tool-error-counts", "Tool errors count as errors",
          {"task": "1/0?", "script": [call("divide", a=1, b=0), "Could not divide: {last_tool_result}"]}, hidden=True),
        T("strict-breaker", "max_consecutive_errors=1",
          {"task": "x", "script": [BAD_JSON, "never"], "max_consecutive_errors": 1}, hidden=True,
          expect={"answer": None, "steps": 1, "tools_called": [], "errors": 1, "stop_reason": "too_many_errors"}),
        T("happy-path", "Happy path reports zero errors",
          {"task": "Weather in Lima?", "script": [W_LIMA, "Lima: {last_tool_result}"]}, hidden=True,
          expect={"answer": "Lima: 16C, overcast", "steps": 2, "tools_called": ["get_weather"], "errors": 0,
                  "stop_reason": "final_answer"}),
        T("max-steps-wins", "max_steps still applies",
          {"task": "x", "script": [BAD_JSON, BAD_JSON, ADD_1_2, BAD_JSON, BAD_JSON], "max_steps": 5}, hidden=True,
          expect={"answer": None, "steps": 5, "tools_called": ["add"], "errors": 4, "stop_reason": "max_steps"}),
    ],
    intuition="""
## Surviving a bad reply

Two production behaviours on top of the stage-4 loop:

1. **Self-correction:** a malformed reply becomes feedback, not a crash.
2. **A circuit breaker:** after N consecutive failures, stop paying for a model that isn't converging.

```text
step 1  model: {"tool": "add", ... {"a": 1,}}
               ↑ broken JSON
        you:   error: could not parse your
               tool call (...)
step 2  model: {"tool": "add", ... "b": 2}}
        tool:  3        ← consecutive resets
step 3  model: The sum is 3.
```

## Put the error in context

The fix is plain error handling, plus one insight: **the error message goes into `messages`**, so on the next call the model can see exactly what it got wrong. Models are good at fixing a call once you show them the problem.

The breaker counts **consecutive** errors, not total. A long task with occasional hiccups is healthy. Three failures in a row means the model is stuck, maybe asking for a tool that doesn't exist or misreading the schema, and more steps won't help.

## Rare failures are guaranteed at scale

At scale, rare failures are guaranteed. A 0.3% malformed-JSON rate across 10,000 runs a day is 30 crashed sessions a day. Every serious agent framework has a version of this: OpenAI Agents SDK's error handlers, LangGraph's `handle_tool_errors`, and the retry-with-feedback loop in Instructor.

## A loop that fails by succeeding

The breaker doesn't catch a model that makes **valid** calls in a circle, like asking for Paris's weather forever. Every call succeeds, so the error count never rises. And nothing bounds cost: a long run can still blow through your token budget. Stage 6 adds those guardrails.

> **Remember:** errors in context are how the model self-corrects, and consecutive errors are how you notice it can't.

Next: stage 6 catches loops and enforces a token budget.
"""))

# ---------------------------------------------------------------------------
STAGES.append(dict(
    n=6, id="agent-guardrails", title="Guardrails: Loop Detection and Token Budgets",
    difficulty="medium", time="20–25 min", function="run_agent",
    signature="run_agent(task, script, max_steps=8, max_consecutive_errors=3, max_tokens=None) -> dict",
    provided=[("Stage 1: parse_tool_call", PARSE_TOOL_CALL), ("Stage 2: validate_arguments", VALIDATE_ARGUMENTS),
              ("Stage 3: dispatch", DISPATCH)], needs_llm=True,
    mission="The most expensive agent bug is the one that never errors: the model calls the same tool with the same arguments forever, and every call succeeds. Add the two guardrails every production agent has, repeat-call detection and a context budget.",
    task="""The starter is the stage-5 loop. Add:

**Loop detection.** For every successfully parsed tool call, build a signature: the tool name followed by `json.dumps(arguments, sort_keys=True)`. If this call's signature equals the previous **two** calls' signatures (three identical in a row), don't run it. Return with `"stop_reason": "loop_detected"` and `"steps": step`. The repeated call isn't added to `tools_called`.

**Token budget.** At the **start** of each step, before calling the model, compute `context_tokens = sum(count_tokens(m["content"]) for m in messages)`. If `max_tokens` is set and `context_tokens > max_tokens`, return with `"stop_reason": "token_budget"` and `"steps": step - 1` (the model calls actually made).

Every returned dict also gets `"context_tokens"`, the sum over `messages` at the moment you return. Defaults change to `max_steps=8`.""",
    constraints=["Parse errors don't add a signature and don't break a streak of identical calls.",
                 "`sort_keys=True` matters: `{\"a\": 1, \"b\": 2}` and `{\"b\": 2, \"a\": 1}` are the same call.",
                 "`count_tokens` is provided (about 4 characters per token)."],
    hints=dict(
        small="Keep a list of recent signatures and compare the last three.",
        strong="recent.append(sig); if recent[-3:] == [sig] * 3: return .... Put the token check as the first thing inside the for-loop.",
        concept="The guardrails that matter in production are about money and time, not just correctness."),
    connections=[LEARN_REACT, LEARN_LOOPS],
    stub=RUN_AGENT_V2.strip() + '''
# TODO (stage 6):
#   - loop detection: 3 identical consecutive tool calls (tool + sorted-args JSON) -> "loop_detected"
#   - token budget: before each model call, stop with "token_budget" if context tokens > max_tokens
#   - add "context_tokens" to every returned dict; new defaults max_steps=8, max_tokens=None
''',
    solution=RUN_AGENT_V3,
    tests=[
        T("loop", "Same call three times in a row", {"task": "Weather in Paris?", "script": [W_PARIS, W_PARIS, W_PARIS, "never"]}),
        T("not-a-loop", "Different arguments are not a loop",
          {"task": "Weather everywhere", "script": [W_PARIS, W_TOKYO, W_LIMA, "All three: {last_tool_result}"]}),
        T("budget", "Context budget stops a long run",
          {"task": "Read the shipping and refund docs, then summarise.",
           "script": [call("lookup_doc", doc_id="shipping"), call("lookup_doc", doc_id="refund-policy"), "Summary"],
           "max_tokens": 75}),
        T("happy", "Happy path reports context_tokens",
          {"task": "Weather in Tokyo?", "script": [W_TOKYO, "Tokyo: {last_tool_result}"]}),
        T("interrupted-streak", "An interrupted streak is not a loop",
          {"task": "x", "script": [W_PARIS, ADD_1_2, W_PARIS, W_PARIS, "ok"]}, hidden=True),
        T("key-order", "Argument key order doesn't hide a loop",
          {"task": "x", "script": [ADD_1_2, ADD_1_2, '{"tool": "add", "arguments": {"b": 2, "a": 1}}', "never"]}, hidden=True),
        T("tiny-budget", "Budget is checked before the first call",
          {"task": "Summarise our refund policy for a customer.", "script": ["never"], "max_tokens": 10}, hidden=True),
        T("still-recovers", "Error recovery from stage 5 still works",
          {"task": "1+2?", "script": [BAD_JSON, ADD_1_2, "= {last_tool_result}"]}, hidden=True),
        T("parse-error-in-streak", "A parse error doesn't reset the streak",
          {"task": "x", "script": [W_PARIS, W_PARIS, BAD_JSON, W_PARIS, "never"]}, hidden=True),
    ],
    intuition="""
## Two guardrails tutorials skip

Two guardrails that every production agent has, and that tutorials usually skip.

**1. Repeat-call detection**

```text
step 1  get_weather(city="Paris")  ✓
step 2  get_weather(city="Paris")  ✓  suspicious
step 3  get_weather(city="Paris")  ✗  stop:
                    loop_detected, not executed
```

Every call here *succeeds*, so stage 5's error breaker never fires. The model is stuck in a reasoning rut, and it will keep repeating the call until `max_steps`.

**2. A context budget.** The model re-reads the entire `messages` list on every call, so cost grows with every step. You check the size *before* paying for the next call.

## Signatures and a sliding window

A **signature** makes "same call" precise. Use the tool name plus the arguments serialised with `sort_keys=True`, so `{"a":1,"b":2}` and `{"b":2,"a":1}` match. Comparing the last three signatures is a sliding window over the call history.

The budget check sums `count_tokens` over every message. A real system would use the provider's tokenizer, or the `usage` field the API returns. About 4 characters per token is the standard rough estimate for English.

## Runaway loops cost real money

Runaway loops are the top cost incident in deployed agents. A loop that repeats a $0.02 call 500 times overnight becomes a line item in somebody's postmortem. Claude Code, Cursor and the OpenAI Agents SDK all ship turn limits and budget controls for this reason.

## Stopping is the bluntest fix

Stopping is the bluntest response. Better agents **intervene**: they tell the model "you've called this three times with the same result, try something different" and give it one more chance. And a hard budget stop throws away all the work so far. What you actually want is to keep running *within* the budget by cutting old context, which is stage 7.

> **Remember:** an agent can fail by succeeding forever. Guard against repetition and against cost, not just errors.

Next: stage 7 trims context to fit a budget without breaking the conversation's structure.
"""))

# ---------------------------------------------------------------------------
SYS = {"role": "system", "content": "You are a helpful travel agent."}
USR = {"role": "user", "content": "Compare the weather in Paris and Tokyo for my trip."}
A1 = {"role": "assistant", "content": W_PARIS}
T1 = {"role": "tool", "content": "18C, light rain"}
A2 = {"role": "assistant", "content": W_TOKYO}
T2 = {"role": "tool", "content": "24C, clear"}
A3 = {"role": "assistant", "content": "Paris is rainy and Tokyo is clear."}
U2 = {"role": "user", "content": "And Lima?"}
CONVO = [SYS, USR, A1, T1, A2, T2, A3, U2]
STAGES.append(dict(
    n=7, id="agent-context-trimming", title="Trim Context Without Orphaning Tool Results",
    difficulty="medium", time="20–25 min", function="trim_messages",
    signature="trim_messages(messages: list[dict], max_tokens: int) -> list[dict]",
    provided=[], needs_llm=True,
    mission="Long agent runs outgrow the context window. Cut the wrong message and the API rejects your request ('tool result without a matching tool call'), or the model forgets what it was asked. Trim the way production agents do.",
    task="""Implement `trim_messages(messages, max_tokens)` and return the messages to keep, in their original order.

- **Pinned, always kept:** the first message if its role is `system`, plus the first `user` message right after it (the task). With no system message, pin only `messages[0]` when it's a user message.
- **Groups:** split the rest into atomic groups. An `assistant` message plus all the `tool` messages directly after it form one group. Every other message is its own group.
- Walk the groups from **newest to oldest**, keeping each group whole while its tokens fit the remaining budget (`max_tokens` minus the pinned tokens). Stop at the first group that doesn't fit, and never skip it to keep an older one.
- Tokens are `count_tokens(m["content"])`, summed.""",
    constraints=["Never return a `tool` message without the `assistant` message that requested it.",
                 "The kept history is one contiguous suffix of the conversation.",
                 "If the pinned messages alone exceed the budget, return just the pinned messages."],
    hints=dict(
        small="Do it in three passes: pin, group, then a greedy walk from the end.",
        strong="When grouping, a tool message joins the previous group if that group starts with an assistant message. Walk `reversed(groups)`, prepend fitting groups, and `break` on the first one that doesn't fit.",
        concept="Context is the agent's working memory, and it has a hard limit. Trim along the conversation's structural boundaries, never through them."),
    connections=[LEARN_CONTEXT, LEARN_REACT],
    stub='''def trim_messages(messages, max_tokens):
    """Keep pinned messages + the newest whole groups that fit max_tokens."""
    # Your code here
    pass
''',
    solution=TRIM_MESSAGES,
    tests=[
        T("fits", "Everything fits: unchanged", {"messages": CONVO, "max_tokens": 1000}, expect=CONVO),
        T("drop-oldest-pair", "Oldest call and its result are dropped together", {"messages": CONVO, "max_tokens": 52}),
        T("no-orphans", "A group that doesn't fit is dropped whole, never split", {"messages": CONVO, "max_tokens": 40}),
        T("pinned-only", "Budget smaller than the pinned messages", {"messages": CONVO, "max_tokens": 5},
          expect=[SYS, USR]),
        T("no-system", "No system message: pin only the task",
          {"messages": [USR, A1, T1, A3], "max_tokens": 26}, hidden=True),
        T("contiguous", "Never skip a big group to keep an older small one",
          {"messages": [SYS, USR, A1, T1, {"role": "assistant", "content": "x" * 200}, U2], "max_tokens": 32}, hidden=True,
          expect=[SYS, USR, U2]),
        T("parallel-group", "Assistant with two tool results is one group",
          {"messages": [SYS, USR, {"role": "assistant", "content": "two calls"}, T1, T2, A3], "max_tokens": 34}, hidden=True),
        T("empty", "Empty conversation", {"messages": [], "max_tokens": 10}, hidden=True, expect=[]),
    ],
    intuition="""
## Cutting context along the seams

A context trimmer that respects the conversation's **structure**:

```text
[system]                ┐ pinned,
[user: the task]        ┘ always kept
[assistant → call]      ┐ group  ← dropped first
[tool result]           ┘
[assistant → call]      ┐ group
[tool result]           ┘
[assistant]               group
[user: "And Lima?"]       group  ← kept first
```

## Pin, group, then walk back from the end

Three passes:

1. **Pin** the system prompt and the original task. Without the task, the agent forgets what it's doing.
2. **Group** each assistant tool-call message with its tool results. They're one unit.
3. **Greedy from the newest:** keep whole groups while they fit, and stop at the first one that doesn't.

Why stop instead of skipping ahead to an older, smaller group? Because the history you keep must be a contiguous story. Keeping step 2 and step 5 but not 3 and 4 hands the model a timeline with holes in it, which is worse than a shorter but intact one.

## Orphaned tool results break the API

Both the Anthropic and OpenAI APIs **reject** a request where a tool result has no matching tool call before it (an "orphaned" result). Naive "keep the last N messages" trimming produces exactly that whenever the cut lands between a call and its result. It's one of the most common production agent bugs, and it shows up only in long sessions, the ones that matter most.

## Dropped turns are gone for good

Dropping old turns loses information permanently. Better systems **summarise** the dropped prefix into a short note ("Earlier: user is planning a Paris/Tokyo trip, Paris is rainy"), or save facts to a long-term memory they can recall later. Claude Code's auto-compact does the summary version. Recall is stage 9.

> **Remember:** trim along structural boundaries, pin the task, and keep a contiguous history.

Next: stage 8 handles the newer tool-calling shape, several calls in one reply.
"""))

# ---------------------------------------------------------------------------
STAGES.append(dict(
    n=8, id="agent-parallel-tool-calls", title="Parallel Tool Calls With IDs",
    difficulty="medium", time="15–20 min", function="execute_tool_calls",
    signature="execute_tool_calls(calls: list[dict], max_parallel: int = 4) -> list[dict]",
    provided=[("Stage 2: validate_arguments", VALIDATE_ARGUMENTS), ("Stage 3: dispatch", DISPATCH)], needs_llm=False,
    mission="Modern models ask for several tools in one turn (check Paris and Tokyo at once), and every result must carry the exact ID of the call it answers. Get the IDs wrong and the API rejects the request.",
    task="""Implement `execute_tool_calls(calls, max_parallel=4)`. Each call is `{"id": str (optional), "tool": str, "arguments": dict (optional)}`.

Return one `{"role": "tool", "tool_call_id": id, "content": str}` per call, **in the same order** as the calls:

- A missing or empty `id` becomes `f"call_{i}"`, with `i` counting from 1 by position.
- An id already used earlier in this batch (including generated ones) gets the content `error: duplicate tool_call_id 'ID'`, and that call isn't run.
- Calls past position `max_parallel` get `error: too many parallel tool calls (limit N)` and aren't run.
- Otherwise the content is `dispatch({"tool": ..., "arguments": ...})`. A missing `arguments` key means `{}`.

One failing call never stops the others.""",
    constraints=["Results stay in call order, so the model can match them to its requests.",
                 "Check for a duplicate id before checking the parallel limit.",
                 "`dispatch` from stage 3 is provided."],
    hints=dict(
        small="Loop with enumerate(calls, start=1) and keep a set of ids you've already seen.",
        strong="call_id = call.get('id') or f'call_{i}'. Duplicate check, then limit check, then dispatch. Add call_id to `seen` every time.",
        concept="The tool_call_id is a foreign key between the model's request and your response. Treat it with the same care as a database key."),
    connections=[LEARN_FUNDAMENTALS, LEARN_REACT],
    stub='''def execute_tool_calls(calls, max_parallel=4):
    """Run a batch of tool calls; return one tool message per call, in order."""
    # Your code here
    pass
''',
    solution=EXECUTE_TOOL_CALLS,
    tests=[
        T("two-cities", "Two calls in one turn",
          {"calls": [{"id": "toolu_01", "tool": "get_weather", "arguments": {"city": "Paris"}},
                     {"id": "toolu_02", "tool": "get_weather", "arguments": {"city": "Tokyo"}}]},
          expect=[{"role": "tool", "tool_call_id": "toolu_01", "content": "18C, light rain"},
                  {"role": "tool", "tool_call_id": "toolu_02", "content": "24C, clear"}]),
        T("generated-ids", "Missing ids are generated by position",
          {"calls": [{"tool": "add", "arguments": {"a": 1, "b": 2}}, {"tool": "lookup_doc", "arguments": {"doc_id": "shipping"}}]}),
        T("independent-failure", "One failure doesn't stop the batch",
          {"calls": [{"id": "a", "tool": "divide", "arguments": {"a": 1, "b": 0}},
                     {"id": "b", "tool": "add", "arguments": {"a": 2, "b": 2}}]}),
        T("duplicate", "Duplicate ids are rejected",
          {"calls": [{"id": "x", "tool": "add", "arguments": {"a": 1, "b": 1}},
                     {"id": "x", "tool": "add", "arguments": {"a": 2, "b": 2}}]}),
        T("limit", "Calls beyond max_parallel are refused",
          {"calls": [{"tool": "add", "arguments": {"a": i, "b": i}} for i in range(5)]}, hidden=True),
        T("empty", "No calls", {"calls": []}, hidden=True, expect=[]),
        T("no-arguments-key", "Missing arguments key", {"calls": [{"id": "z", "tool": "lookup_doc"}]}, hidden=True),
        T("generated-collision", "A generated id can collide with an explicit one",
          {"calls": [{"id": "call_2", "tool": "add", "arguments": {"a": 1, "b": 1}},
                     {"tool": "add", "arguments": {"a": 3, "b": 3}}]}, hidden=True),
        T("custom-limit", "max_parallel=1",
          {"calls": [{"id": "p", "tool": "get_weather", "arguments": {"city": "Lima"}},
                     {"id": "q", "tool": "get_weather", "arguments": {"city": "Paris"}}], "max_parallel": 1}, hidden=True),
    ],
    intuition="""
## Several calls in one reply

The batch executor for **parallel tool calls**, where the model emits several calls in one reply:

```text
assistant:
  tool_use  id=toolu_01  get_weather(Paris)
  tool_use  id=toolu_02  get_weather(Tokyo)
you:
  tool_result  toolu_01  "18C, light rain"
  tool_result  toolu_02  "24C, clear"
```

## IDs tie each result to its call

Each result echoes the **id** of the call it answers. The model uses those ids to line up results with requests, and the APIs validate them strictly. Every call needs exactly one result with a matching id. A duplicate, a missing one or an extra one gets the request rejected.

Two policies show up here that you'll meet again in real systems:
- **Isolation:** each call succeeds or fails on its own. A failed divide shouldn't erase a successful weather lookup.
- **Fan-out limit:** a confused model can emit 50 calls at once. Cap it, and tell the model why in plain words.

## Parallel calls cut latency

Parallel calls cut latency a lot. Two independent lookups take as long as the slower one, not the sum. Claude, GPT-4-class models and Gemini all emit them by default when calls are independent. Your stage-12 capstone uses this function directly.

## Protocol-parallel isn't truly concurrent

This runs calls one after another, so it's "parallel" only in the protocol sense. Real executors use `asyncio.gather` or a thread pool, with per-call timeouts. And running calls concurrently is only safe when they're **independent**: two calls that write to the same record need ordering. When steps depend on each other, you need a plan, which is stage 10.

> **Remember:** one result per call, same order, matching ids, and each call fails on its own.

Next: stage 9 gives the agent a long-term memory that outlives the context window.
"""))

# ---------------------------------------------------------------------------
MEMS = [
    {"id": "m1", "turn": 1, "text": "User's name is Priya and she lives in Lima."},
    {"id": "m2", "turn": 3, "text": "Priya prefers vegetarian restaurants."},
    {"id": "m3", "turn": 4, "text": "The user's flight to Tokyo departs on March 3."},
    {"id": "m4", "turn": 6, "text": "Priya moved from Lima to Paris last month."},
    {"id": "m5", "turn": 7, "text": "Weather in Paris was rainy during the last trip."},
]
STAGES.append(dict(
    n=9, id="agent-memory-recall", title="Long-Term Memory Recall",
    difficulty="medium", time="15–20 min", function="recall",
    signature="recall(memories: list[dict], query: str, k: int = 3) -> list[str]",
    provided=[], needs_llm=False,
    mission="Trimming (stage 7) throws old turns away. Long-term memory keeps the important facts outside the context window and brings back only the ones relevant to the current question, newest first when facts conflict.",
    task="""Implement `recall(memories, query, k=3)`. Each memory is `{"id": str, "turn": int, "text": str}`.

- **Terms** of a text: lowercase it, take `re.findall(r"[a-z0-9]+", ...)`, and drop single-character words (the "s" in "user's") and words in the provided `STOPWORDS` set. Use a set, so repeats count once.
- **Score** of a memory: the number of query terms that also appear in the memory's terms.
- Leave out memories that score 0.
- Sort by score (high first), then `turn` (newer first), then `id` (alphabetical).
- Return the ids of the top `k`.""",
    constraints=["`STOPWORDS` is provided in the starter. Use it as-is.",
                 "Return a list of ids, not the memory dicts.",
                 "A query made only of stopwords recalls nothing."],
    hints=dict(
        small="Write a helper that turns any text into its set of terms, then score with set intersection.",
        strong="scored.append((-score, -turn, id)), then sort ascending. That one tuple gives all three tie-breaks.",
        concept="Recency as the tie-break is how an agent prefers 'moved to Paris last month' over 'lives in Lima' when both match."),
    connections=[LEARN_CONTEXT, LEARN_FUNDAMENTALS],
    stub='''STOPWORDS = {"a", "an", "and", "are", "did", "do", "does", "for", "i", "in", "is",
             "it", "me", "my", "of", "on", "the", "to", "was", "what", "when",
             "where", "which", "who", "with", "you", "your"}


def recall(memories, query, k=3):
    """Return the ids of the k most relevant memories (score, then recency, then id)."""
    # Your code here
    pass
''',
    solution=RECALL,
    tests=[
        T("conflict", "Newer fact outranks the older one",
          {"memories": MEMS, "query": "Which city is Priya in now: Lima or Paris?"}, expect=["m4", "m1", "m5"]),
        T("single", "One clear match", {"memories": MEMS, "query": "When does the Tokyo flight leave?"}, expect=["m3"]),
        T("nothing", "No overlap recalls nothing", {"memories": MEMS, "query": "What's the GDP of Chile?"}, expect=[]),
        T("k1", "k limits the result", {"memories": MEMS, "query": "Priya Paris", "k": 1}, expect=["m4"]),
        T("recency-tie", "Equal scores: newest first", {"memories": MEMS, "query": "PARIS?!"}, hidden=True,
          expect=["m5", "m4"]),
        T("id-tie", "Same score and turn: id order",
          {"memories": [{"id": "b", "turn": 2, "text": "tea"}, {"id": "a", "turn": 2, "text": "tea"}], "query": "tea"},
          hidden=True, expect=["a", "b"]),
        T("stopwords-only", "Stopword-only query", {"memories": MEMS, "query": "what is it?"}, hidden=True, expect=[]),
        T("empty", "No memories", {"memories": [], "query": "Paris"}, hidden=True, expect=[]),
        T("repeat-terms", "Repeated query words count once",
          {"memories": MEMS, "query": "paris paris paris vegetarian"}, hidden=True, expect=["m5", "m4", "m2"]),
    ],
    intuition="""
## Memory that outlives the context window

The **read path** of an agent's long-term memory. Facts get saved during a conversation, and later, for a new question, you pull back only the few that matter.

```text
query: "Which city is Priya in now:
        Lima or Paris?"

m4 turn 6  Priya moved from Lima to Paris  3
m1 turn 1  Priya ... lives in Lima         2
m5 turn 7  Weather in Paris was rainy      1
                                 recall → [m4, m1, m5]
```

## Overlap first, recency second

Score by **term overlap** after removing stopwords, then break ties by **recency**. Recency is the tie-break because memories go stale: "lives in Lima" (turn 1) and "moved to Paris" (turn 6) both match, and the newer fact is more likely true now.

## Where you've seen this pattern

This is the pattern behind ChatGPT's memory, Letta/MemGPT's archival memory and LangGraph's long-term store: write facts outside the context window and retrieve a few per turn. It's what lets an agent stay coherent across sessions without its context growing forever. It also pairs with stage 7: what you trim out of context can be saved as memory first.

## Keywords miss what embeddings catch

Keyword overlap is brittle. "Where does Priya **live**?" doesn't match "she **lives** in Lima" without stemming, and it misses synonyms entirely ("residence", "home"). Production memory uses **embeddings**, semantic vector search (see the RAG and vector-search tracks), usually combined with keyword scoring (hybrid search) plus recency decay. Retrieving a fact also isn't the same as resolving a conflict: the model still has to decide that "moved" overrides "lives".

> **Remember:** retrieve a few relevant memories per turn, rank by relevance first and then recency, and never dump all memory into context.

Next: stage 10 moves from reacting step by step to **planning** a whole multi-step job up front.
"""))

# ---------------------------------------------------------------------------
def step(id, tool, depends_on=None, **arguments):
    return {"id": id, "tool": tool, "arguments": arguments, "depends_on": depends_on or []}


STAGES.append(dict(
    n=10, id="agent-plan-and-execute", title="Plan-and-Execute With Dependencies",
    difficulty="hard", time="25–30 min", function="execute_plan",
    signature="execute_plan(plan: list[dict]) -> dict",
    provided=[("Stage 2: validate_arguments", VALIDATE_ARGUMENTS), ("Stage 3: dispatch", DISPATCH)], needs_llm=False,
    mission="ReAct decides one step at a time, and pays a model call for every step. Plan-and-execute has the model write the whole plan once, then your code runs it: in dependency order, piping outputs into later steps, and skipping work that depends on a failure.",
    task="""Implement `execute_plan(plan)`. Each step is `{"id", "tool", "arguments", "depends_on": [ids]}`.

1. **Validate first, run nothing on failure:** raise `ValueError` for duplicate step ids, a `depends_on` that names an unknown step, or a dependency cycle.
2. **Order** the steps topologically (Kahn's algorithm). When several steps are ready, take the one that comes first in `plan`.
3. **Run** each step in that order:
   - If any dependency's status isn't `"ok"`, the step is `{"status": "skipped", "output": None}`.
   - Otherwise substitute arguments. A string argument that is exactly `"$<step id>"` becomes that step's output, parsed with `json.loads` when possible (so `"5"` becomes `5`), or the raw string otherwise.
   - Run it with `dispatch`. If the output starts with `error:`, the status is `"error"`, otherwise `"ok"`.
4. Return `{"order": [ids in run order], "results": {id: {"status", "output"}}}`. Skipped steps appear in `order` too.""",
    constraints=["Detect a cycle when no remaining step is ready, before executing anything.",
                 "Skipping is transitive: a step that depends on a skipped step is also skipped.",
                 "`$`-strings that don't name a step are passed through unchanged."],
    hints=dict(
        small="Do it in two phases: validate and order without calling any tool, then execute.",
        strong="remaining = {id: set(depends_on)}. Repeatedly choose the first plan step whose set is empty, remove it from every other set, and raise if nothing is ready. For substitution, use try: json.loads(raw) except ValueError: raw.",
        concept="A plan is a DAG. Validate the whole graph before any side effects happen, so a bad plan fails fast instead of halfway."),
    connections=[LEARN_PLAN, LEARN_LOOPS],
    stub='''def execute_plan(plan):
    """Validate, topologically order and run a plan of tool steps."""
    # Your code here
    pass
''',
    solution=EXECUTE_PLAN,
    tests=[
        T("chain", "Output of one step feeds the next",
          {"plan": [step("s1", "add", a=2, b=3), step("s2", "add", ["s1"], a="$s1", b=10)]},
          expect={"order": ["s1", "s2"], "results": {"s1": {"status": "ok", "output": "5"},
                                                      "s2": {"status": "ok", "output": "15"}}}),
        T("reorder", "Plan order isn't run order",
          {"plan": [step("total", "add", ["x"], a="$x", b=1), step("x", "divide", a=9, b=3), step("w", "get_weather", city="Lima")]}),
        T("skip-on-failure", "Dependents of a failed step are skipped",
          {"plan": [step("s1", "divide", a=1, b=0), step("s2", "add", ["s1"], a="$s1", b=1),
                    step("s3", "get_weather", city="Tokyo")]}),
        T("cycle", "Cycles are rejected before anything runs",
          {"plan": [step("a", "add", ["b"], a=1, b=1), step("b", "add", ["a"], a=1, b=1)]}, error="ValueError"),
        T("unknown-dep", "Unknown dependency", {"plan": [step("a", "add", ["ghost"], a=1, b=1)]}, hidden=True,
          error="ValueError"),
        T("string-output", "Non-JSON outputs are passed as strings",
          {"plan": [step("doc", "lookup_doc", doc_id="refund-policy"), step("w", "get_weather", ["doc"], city="$doc")]},
          hidden=True),
        T("transitive-skip", "Skips cascade",
          {"plan": [step("s1", "get_weather", city="Atlantis"), step("s2", "add", ["s1"], a=1, b=1),
                    step("s3", "add", ["s2"], a=1, b=1)]}, hidden=True),
        T("duplicate-id", "Duplicate ids", {"plan": [step("a", "add", a=1, b=1), step("a", "add", a=2, b=2)]},
          hidden=True, error="ValueError"),
        T("diamond", "Diamond dependency",
          {"plan": [step("s1", "add", a=1, b=1), step("s2", "add", ["s1"], a="$s1", b=10),
                    step("s3", "add", ["s1"], a="$s1", b=100), step("s4", "add", ["s2", "s3"], a="$s2", b="$s3")]},
          hidden=True),
    ],
    intuition="""
## Running a plan someone else wrote

The **executor** half of a plan-and-execute agent. The model has already written a plan:

```text
s1: divide(9, 3)                 s1 ──► s2 ──► s4
s2: add($s1, 10)    depends s1     └──► s3 ──┘
s3: add($s1, 100)   depends s1
s4: add($s2, $s3)   depends s2, s3
```

Your code checks that the plan is a valid DAG, orders it, pipes outputs into later steps, and contains failures.

## Kahn's algorithm, with a deterministic tie-break

**Kahn's algorithm:** repeatedly take a step with no unfinished dependencies. If steps remain but none is ready, there's a cycle. Breaking ties by plan order makes runs **deterministic**, so the same plan always runs the same way, which you'll want when debugging.

**Validate before side effects.** All checks happen before any tool runs. A plan with a cycle in step 9 shouldn't have already sent the email in step 1.

**Failure containment.** A failed step poisons only what depends on it (transitively). Independent branches still finish, so you get partial results instead of nothing.

## One planning call instead of one per step

Compared with ReAct (stage 4), plan-and-execute makes **one** big model call to plan, then runs tools without calling the model between steps. That's cheaper and faster, and the plan is inspectable *before* anything runs, so a human can approve it. LangGraph's plan-and-execute template, LLMCompiler (which also runs independent branches in parallel) and Claude Code's todo lists all share this shape.

## A frozen plan can't adapt

The plan is frozen. If step 2 reveals something surprising ("that flight is sold out"), a pure executor can't adapt. Production systems add a **replanning** step: on failure or surprise, send the results so far back to the model and ask for a revised plan. That hybrid of planning up front and reacting when needed is how most serious agents work.

> **Remember:** a plan is a DAG. Validate it whole, run it in order, contain failures, and know when to replan.

Next: you've built a lot of agent. Stage 11 asks whether it's actually any good, and makes you **measure** it.
"""))

# ---------------------------------------------------------------------------
def case(name, task, script, expected_answer_contains, expected_tools, **extra):
    return dict(name=name, task=task, script=script, expected_answer_contains=expected_answer_contains,
                expected_tools=expected_tools, **extra)


GOOD_WEATHER = case("weather-paris", "Weather in Paris?", [W_PARIS, "Paris: {last_tool_result}"], "light rain", ["get_weather"])
GOOD_MATH = case("sum", "What is 1 + 2?", [ADD_1_2, "It's {last_tool_result}."], "3", ["add"])
WRONG_ANSWER = case("hallucinated", "Weather in Tokyo?", [W_TOKYO, "Tokyo is snowing."], "clear", ["get_weather"])
WRONG_TOOLS = case("no-lookup", "Shipping time?", ["Shipping takes 3-5 business days."], "3-5", ["lookup_doc"])
LOOPING = case("stuck", "Weather in Lima?", [W_LIMA, W_LIMA, W_LIMA, "never"], "overcast", ["get_weather"])
STAGES.append(dict(
    n=11, id="agent-eval-harness", title="Evaluate Your Agent",
    difficulty="hard", time="20–25 min", function="evaluate_agent",
    signature="evaluate_agent(cases: list[dict]) -> dict",
    provided=[("Stage 1: parse_tool_call", PARSE_TOOL_CALL), ("Stage 2: validate_arguments", VALIDATE_ARGUMENTS),
              ("Stage 3: dispatch", DISPATCH), ("Stage 6: run_agent (with guardrails)", RUN_AGENT_V3)], needs_llm=True,
    mission="'It worked when I tried it' isn't an evaluation. Build the harness that runs your agent over a suite of cases and reports the numbers teams actually track: task success, tool-call accuracy, steps, and why each failure failed.",
    task="""Implement `evaluate_agent(cases)`. Each case has `name`, `task`, `script`, `expected_answer_contains`, `expected_tools` (a list), and an optional `max_steps` (default 8).

For each case, call the provided `run_agent(case["task"], case["script"], max_steps=...)` (your stage-6 agent). Then classify it, checking in this order:
1. `answer` is `None`: failure reason `"no_answer:" + stop_reason`
2. `tools_called != expected_tools`: `"wrong_tools"`
3. `expected_answer_contains` isn't in the answer (case-insensitive): `"wrong_answer"`
4. Otherwise the case passed.

Return:
```
{"pass_rate": passed / n,                       rounded to 3 places
 "tool_accuracy": exact-tool-match cases / n,   rounded to 3 places
 "avg_steps": mean steps,                       rounded to 2 places
 "failures": {case name: reason}}
```
Raise `ValueError` for an empty list of cases.""",
    constraints=["`tool_accuracy` counts every case whose tools match, including cases that failed for another reason.",
                 "Use `round()` exactly as specified. Floats are compared with a 1e-5 tolerance.",
                 "Don't re-implement the agent. Call the provided `run_agent`."],
    hints=dict(
        small="Keep running counters (passed, right_tools, total_steps) and a failures dict while you loop over the cases.",
        strong="The order of the checks is the spec. A run with no answer is 'no_answer:...' even when its tools also differ.",
        concept="Separate trajectory metrics (did it call the right tools?) from outcome metrics (is the answer right?). An agent can get the right answer by luck, with the wrong tools."),
    connections=[LEARN_EVAL, LEARN_REACT],
    stub='''def evaluate_agent(cases):
    """Run run_agent over every case; return pass_rate, tool_accuracy, avg_steps, failures."""
    # Your code here
    pass
''',
    solution=EVALUATE_AGENT,
    tests=[
        T("all-pass", "A passing suite", {"cases": [GOOD_WEATHER, GOOD_MATH]},
          expect={"pass_rate": 1.0, "tool_accuracy": 1.0, "avg_steps": 2.0, "failures": {}}),
        T("mixed", "Wrong answer vs wrong tools", {"cases": [GOOD_WEATHER, WRONG_ANSWER, WRONG_TOOLS]}),
        T("no-answer", "A looping agent produces no answer", {"cases": [GOOD_MATH, LOOPING]}),
        T("empty", "Empty suite is an error", {"cases": []}, error="ValueError"),
        T("case-insensitive", "Answer match ignores case",
          {"cases": [case("caps", "Weather in Paris?", [W_PARIS, "PARIS: {last_tool_result}"], "LIGHT RAIN", ["get_weather"])]},
          hidden=True),
        T("per-case-max-steps", "max_steps per case",
          {"cases": [case("short", "Weather?", [W_PARIS, W_TOKYO, "done"], "done", ["get_weather", "get_weather"], max_steps=2)]},
          hidden=True),
        T("right-answer-wrong-tools", "Right answer, wrong tools still fails",
          {"cases": [case("lucky", "1+2?", ["It's 3."], "3", ["add"]), GOOD_MATH]}, hidden=True),
        T("thirds", "Rounding", {"cases": [GOOD_MATH, WRONG_ANSWER, LOOPING]}, hidden=True),
    ],
    intuition="""
## Turning 'seems fine' into numbers

An **eval harness**: the tool that turns "seems fine" into numbers you can track from one commit to the next.

```text
cases ─► run_agent ─► classify ─► report
  pass_rate      0.333
  tool_accuracy  0.667
  avg_steps      2.33
  failures       hallucinated: wrong_answer
                 stuck: no_answer:loop_detected
```

## Outcome and trajectory are separate questions

Every run is checked for two different things:

- **Outcome:** did the final answer contain what it should?
- **Trajectory:** did the agent call the right tools, in the right order?

They come apart in instructive ways. A **"lucky"** run answers "3" without calling `add`. Today that's correct, but it means the model is guessing and not computing, and it'll guess wrong on 1847 × 23. A **"hallucinated"** run calls the right tool and then ignores the result. Each failure mode needs a different fix (prompting vs tool design), so the reason has to be recorded, not just pass/fail.

The order of the checks matters: "no answer" is the most fundamental failure, so it's reported first.

## The question every interviewer asks

Every change to an agent (the prompt, the model version, a tool description) can quietly break something that used to work. Teams run a suite like this on every change, the way unit tests run on every commit. It's the most common gap interviewers probe in "I built an agent" projects: *how do you know it works?*

## Substring matching is a weak judge

Substring matching is a weak oracle: "it's not 3" contains "3". Real harnesses use exact or structured matches where they can, **LLM-as-judge** with a rubric for free text, and they run each case several times, because real models are non-deterministic (pass@k, and the mean with its variance). Scripted models make this stage deterministic, which is right for learning how a harness works and wrong for measuring a real model.

> **Remember:** measure outcomes and trajectories separately, record why each case failed, and run the suite on every change.

Next: the capstone. Put every stage together into one production-grade loop.
"""))

# ---------------------------------------------------------------------------
PAR = '{"tool_calls": [{"id": "a", "tool": "get_weather", "arguments": {"city": "Paris"}}, {"id": "b", "tool": "get_weather", "arguments": {"city": "Tokyo"}}]}'
PAR_HALF = '{"tool_calls": [{"tool": "get_weather", "arguments": {"city": "Atlantis"}}, {"tool": "add", "arguments": {"a": 1, "b": 1}}]}'
STAGES.append(dict(
    n=12, id="agent-capstone", title="Capstone: A Production Agent Loop",
    difficulty="hard", time="45–60 min", function="run_agent_v2",
    signature="run_agent_v2(task: str, script: list[str], config: dict) -> dict",
    provided=[("Stage 2: validate_arguments", VALIDATE_ARGUMENTS), ("Stage 3: dispatch", DISPATCH),
              ("Stage 7: trim_messages", TRIM_MESSAGES), ("Stage 8: execute_tool_calls", EXECUTE_TOOL_CALLS)],
    needs_llm=True,
    mission="Put it all together: one loop that handles single and parallel tool calls, recovers from errors, detects loops, trims its context, enforces a real cost budget, and leaves a trace you could debug at 3am. This is the core of a real agent runtime, written by you.",
    task="""Implement `parse_reply(text)` and `run_agent_v2(task, script, config)`.

**parse_reply** extends stage 1. Return `None` if the text has no `"tool` substring. Extract the JSON the same way as stage 1. If it has a `tool_calls` list, each item is a call; otherwise the object itself is one call. Return a list of `{"id", "tool", "arguments"}` (`id` may be `None`). Raise `ValueError` on bad JSON or bad shape.

**run_agent_v2.** `config` keys, all optional: `max_steps` (8), `max_consecutive_errors` (3), `max_tokens` (None), `context_limit` (None). Each step:
1. `context = trim_messages(messages, context_limit)` if a limit is set, else `messages`. Its token cost is the sum of `count_tokens` over `context`. If `max_tokens` is set and the tokens already spent plus this cost would exceed it, return `"token_budget"` with `steps = step - 1`. Otherwise add the cost to the tokens spent, which accumulate across calls, and call `llm(context)`.
2. Append the reply as an assistant message, then:
   - Parse error: feedback exactly as in stage 5, count an error, and add `{"step", "action": "parse_error"}` to `trace`.
   - Final answer: trace `{"step", "action": "final_answer"}`, then return.
   - Calls: the signature is `json.dumps([[tool, arguments], ...], sort_keys=True)`. If it's the same as the last two signatures, trace `"loop_detected"` and return. Otherwise run `execute_tool_calls(calls)`, append every result message, add each tool name to `tools_called`, count the failed results as errors, and trace `{"step", "action": "tools", "tools": [...], "failed": n}`.
3. Consecutive errors go up after a parse error, or after a tool step where **every** call failed. A tool step with at least one success resets them to 0. Stop with `"too_many_errors"` when they reach the limit.

Return `{"answer", "steps", "stop_reason", "tools_called", "errors", "trace"}`.""",
    constraints=["Provided: `trim_messages` (stage 7) and `execute_tool_calls` (stage 8), plus `dispatch` and `validate_arguments`.",
                 "Token spend is cumulative: you pay for the whole context on every call.",
                 "The scripted model fills `{context_size}` with the number of messages you sent it, so trimming is visible to the tests."],
    hints=dict(
        small="Start from your stage-6 loop, swap parse_tool_call for parse_reply and dispatch for execute_tool_calls, then add trimming and the trace.",
        strong="Write a small finish(answer, steps, reason) closure so all five exits return the same shape. A tool step counts toward consecutive errors only when step_failed == len(calls).",
        concept="This is a minimal agent runtime: control flow, a protocol, budgets and observability. Frameworks wrap exactly these pieces."),
    connections=[LEARN_REACT, LEARN_CONTEXT, LEARN_LOOPS],
    stub='''def parse_reply(text):
    """None for a final answer, else a list of {"id", "tool", "arguments"} calls.
    Supports a single call or {"tool_calls": [...]}. Raise ValueError if malformed."""
    # Your code here
    pass


def run_agent_v2(task, script, config):
    """The full loop: parallel calls, recovery, loop detection, trimming, budget, trace."""
    llm = make_llm(script)
    messages = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": task}]
    # Your code here
    pass
''',
    solution=CAPSTONE,
    tests=[
        T("single", "Single call then answer",
          {"task": "Weather in Lima?", "script": [W_LIMA, "Lima: {last_tool_result}"], "config": {}}),
        T("parallel", "Parallel calls in one reply",
          {"task": "Paris and Tokyo?", "script": [PAR, "Last result: {last_tool_result}"], "config": {}}),
        T("trimmed", "Context limit trims what the model sees",
          {"task": "Weather tour", "script": [W_PARIS, W_TOKYO, W_LIMA, "I saw {context_size} messages; latest: {last_tool_result}"],
           "config": {"context_limit": 60}}),
        T("budget", "Cumulative token budget",
          {"task": "Weather tour", "script": [W_PARIS, W_TOKYO, W_LIMA, "done"], "config": {"max_tokens": 150}}),
        T("recover", "Parse error recovery is traced",
          {"task": "1+2?", "script": [BAD_JSON, ADD_1_2, "= {last_tool_result}"], "config": {}}, hidden=True),
        T("parallel-loop", "Repeated parallel batch is a loop",
          {"task": "x", "script": [PAR, PAR, PAR, "never"], "config": {}}, hidden=True),
        T("partial-failure", "Half-failed batch resets the breaker",
          {"task": "x", "script": [BAD_JSON, BAD_JSON, PAR_HALF, BAD_JSON, "ok"], "config": {}}, hidden=True),
        T("all-failed", "Fully failed batches trip the breaker",
          {"task": "x", "script": [UNKNOWN, UNKNOWN, "never"], "config": {"max_consecutive_errors": 2}}, hidden=True),
        T("max-steps", "max_steps", {"task": "x", "script": [W_PARIS, W_TOKYO], "config": {"max_steps": 2}}, hidden=True),
        T("fenced-parallel", "Fenced parallel calls",
          {"task": "x", "script": ["On it.\n```json\n" + PAR + "\n```", "{last_tool_result}"], "config": {}}, hidden=True),
    ],
    intuition="""
## The whole runtime, end to end

Everything at once: the loop from stage 4, wired to every piece you've built.

```text
each step:
  budget check (6)
  trim_messages (7)
  llm(context)
  parse_reply (1, extended)
    ├─ final answer      → return
    ├─ parse error       → feedback (5)
    └─ tool calls
         loop check (6)
         execute_tool_calls (8)
           dispatch (3) → validate (2)
         results → messages, trace
```

## What's new since stage 6

Two things are new compared with stage 6:

- **Cost is cumulative.** Stage 6 checked how big the context was. Here you track what you've **spent**: every model call bills the whole context it was sent. Trimming (stage 7) is what keeps that number under control on long runs, so the two guardrails work together.
- **Partial failure.** With parallel calls, "the step failed" is ambiguous. The rule here is that a step counts as a failure only if **every** call in it failed, because one good result means the model is still making progress.

The **trace** is a small structured log, one entry per step. When a user reports "the agent did something weird," the trace is what you read.

## You can now read the framework source

This is the shape of a real agent runtime. OpenAI's Agents SDK, LangGraph's prebuilt agent, smolagents and Claude Code's loop add persistence, streaming, async tools and human approval on top, but the core is these pieces: a protocol, control flow, budgets and observability. You can now read their source and recognise every part, which also makes you good at debugging them.

## Where real runtimes go next

It's still synchronous, in-memory and single-agent. The next steps in the real world: **async tools** with timeouts, **persistence** so a run survives a restart (LangGraph checkpointers), **human-in-the-loop** approval before irreversible tools, **streaming** partial output, and **multi-agent** orchestration, where one agent's tool is another agent.

> **Remember:** an agent is a loop with a protocol, guardrails and a trace. You just built one.
"""))
