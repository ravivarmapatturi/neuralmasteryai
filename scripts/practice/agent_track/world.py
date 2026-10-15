"""Shared code blocks for the "Build an Agent" practice track.

Each stage's starter code is assembled from these blocks (the harness the
learner's agent runs inside) plus the reference solutions of earlier stages,
so stage N literally builds on stage N-1 -- the CodeCrafters pattern.
Nothing here is ever shown as "the answer" to the stage that asks for it.
"""

IMPORTS = '''import json
import math
import re
'''

WORLD = '''
# ---------------------------------------------------------------------------
# The sandbox world your agent lives in (provided -- you don't edit this).
# Four deterministic tools, each with a JSON-Schema-style argument spec,
# exactly the shape you'd hand a real model's tool-calling API.
# ---------------------------------------------------------------------------
WEATHER = {"paris": "18C, light rain", "tokyo": "24C, clear", "lima": "16C, overcast"}
DOCS = {
    "refund-policy": "Refunds are accepted within 30 days with a receipt.",
    "shipping": "Standard shipping takes 3-5 business days.",
}


def add(a, b):
    return a + b


def divide(a, b):
    return a / b


def get_weather(city):
    key = city.strip().lower()
    if key not in WEATHER:
        raise ValueError(f"no weather data for {city}")
    return WEATHER[key]


def lookup_doc(doc_id):
    if doc_id not in DOCS:
        raise ValueError(f"no document named {doc_id}")
    return DOCS[doc_id]


NUM = {"type": "number"}
TOOLS = {
    "add": {"fn": add, "schema": {"type": "object", "properties": {"a": NUM, "b": NUM}, "required": ["a", "b"]}},
    "divide": {"fn": divide, "schema": {"type": "object", "properties": {"a": NUM, "b": NUM}, "required": ["a", "b"]}},
    "get_weather": {"fn": get_weather, "schema": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}},
    "lookup_doc": {"fn": lookup_doc, "schema": {"type": "object", "properties": {"doc_id": {"type": "string"}}, "required": ["doc_id"]}},
}
'''

LLM = '''

# ---------------------------------------------------------------------------
# A scripted stand-in for the model (provided). It replies with `script`
# in order, but it still READS the conversation: placeholders in a reply
# are filled from the messages it was actually sent, so a loop that forgets
# to feed results back gets a wrong answer -- just like a real model would.
#   {last_tool_result}  -> content of the most recent "tool" message
#   {last_feedback}     -> content of the most recent non-assistant message
#   {context_size}      -> how many messages the model was sent this call
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = (
    "You are a helpful agent. To use a tool, reply with JSON: "
    '{"tool": <name>, "arguments": {...}}. Otherwise reply with your final answer.'
)


def make_llm(script):
    replies = list(script)

    def llm(messages):
        if not replies:
            raise RuntimeError("model script exhausted -- your loop called the model too many times")
        reply = replies.pop(0)
        if "{last_tool_result}" in reply:
            last = next((m["content"] for m in reversed(messages) if m["role"] == "tool"), "")
            reply = reply.replace("{last_tool_result}", last)
        if "{last_feedback}" in reply:
            last = next((m["content"] for m in reversed(messages) if m["role"] != "assistant"), "")
            reply = reply.replace("{last_feedback}", last)
        if "{context_size}" in reply:
            reply = reply.replace("{context_size}", str(len(messages)))
        return reply

    return llm


def count_tokens(text):
    """Rough token estimate: ~4 characters per token (good enough for budgets)."""
    return math.ceil(len(text) / 4)
'''
