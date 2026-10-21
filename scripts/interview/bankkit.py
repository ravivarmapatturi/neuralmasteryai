"""Small helpers shared by the interview banks."""


def C(id, q, options, answer, worked, follow=()):
    """A pick-one question. options: [(text, why), ...]; answer: index of the right one."""
    return {"kind": "choice", "id": id, "q": q, "options": [{"text": t, "why": w} for t, w in options],
            "answer": answer, "worked": worked, "follow": list(follow)}


def N(id, q, answer, worked, unit="", tol=0.02, follow=()):
    """A numeric question. answer is computed in the bank file, never typed by hand."""
    return {"kind": "calc", "id": id, "q": q, "answer": answer, "unit": unit, "tol": tol,
            "worked": worked, "follow": list(follow)}


def S(title, intro, questions):
    return {"title": title, "intro": intro, "questions": questions}
