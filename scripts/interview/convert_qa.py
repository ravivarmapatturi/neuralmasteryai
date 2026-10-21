"""Turn reveal-only <QA> cards into checkable <Choice>/<Calc> questions, in place.

    python3 -I scripts/interview/convert_qa.py           # rewrite the pages
    python3 -I scripts/interview/convert_qa.py --check   # report only

Only questions with an honest check are converted: a scenario to diagnose,
a decision between real alternatives, or a number to compute. Questions
whose answer is an explanation ("What is self-attention?") stay as reveal
cards, because a pick-the-definition version would test recognition of
wording, not understanding.

Each conversion keeps the original answer, word for word, as the worked
answer. It's re-runnable: a question already converted (its id is on the
page) is skipped.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DOCS = os.path.join(ROOT, "src", "content", "docs", "interview-prep")

from build_banks import render_question, unsafe_for_mdx  # noqa: E402
from qa_conversions import CONVERSIONS, INTRO_EDITS  # noqa: E402

IMPORT = "import { Choice, Calc, BankScore } from '../../../components/content/InterviewCheck';"
QA_BLOCK = re.compile(r'<QA q=(?:"((?:[^"\\]|\\.)*)"|\{"((?:[^"\\]|\\.)*)"\})>\n(.*?)\n</QA>', re.S)


def convert_file(name, conversions, check_only):
    path = os.path.join(DOCS, name)
    text = open(path).read()
    blocks = {}
    for m in QA_BLOCK.finditer(text):
        blocks[(m.group(1) or m.group(2)).replace('\\"', '"')] = m
    done, skipped, missing = 0, 0, []
    for conv in conversions:
        if f'id={{"{conv["id"]}"}}' in text:
            skipped += 1
            continue
        m = blocks.get(conv["match"])
        if m is None:
            missing.append(conv["match"])
            continue
        question = dict(conv)
        question.setdefault("q", conv["match"])
        body = m.group(3).strip()
        question["worked"] = (conv["pre"].strip() + "\n\n" + body) if conv.get("pre") else body
        question["follow"] = []
        bad = unsafe_for_mdx(conv.get("pre", ""))
        if bad:
            raise SystemExit(f"{conv['id']}: {''.join(bad)} outside code in pre")
        rendered = render_question(question)
        text = text.replace(m.group(0), rendered, 1)
        done += 1
    for old, new in INTRO_EDITS.get(name, []):
        text = text.replace(old, new, 1)
    if done and IMPORT not in text:
        text = re.sub(r"(import \{ QA \} from '[^']+';)", r"\1\n" + IMPORT, text, count=1)
        text = re.sub(r"\n## ", "\n<BankScore />\n\n## ", text, count=1)
    remaining = len(QA_BLOCK.findall(text))
    print(f"  {name}: {done} converted, {skipped} already done, {remaining} left as reveal cards")
    if missing:
        print("    NOT FOUND:\n      " + "\n      ".join(missing))
    if not check_only:
        open(path, "w").write(text)
    return not missing


def main():
    check_only = "--check" in sys.argv
    ok = True
    for name, conversions in CONVERSIONS.items():
        ok &= convert_file(name, conversions, check_only)
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
