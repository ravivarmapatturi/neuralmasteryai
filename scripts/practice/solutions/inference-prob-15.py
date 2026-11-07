def beam_search_step(current_beams, candidate_log_probs, beam_width, eos_token_id):
    if beam_width <= 0:
        raise ValueError("beam_width must be positive")
    if len(current_beams) != len(candidate_log_probs):
        raise ValueError("one row of log-probs per beam")
    candidates = []
    for beam, log_probs in zip(current_beams, candidate_log_probs):
        if beam["is_done"]:
            candidates.append(dict(beam))  # finished beams are not expanded
            continue
        for token, lp in enumerate(log_probs):
            candidates.append({
                "sequence": beam["sequence"] + [token],
                "score": round(beam["score"] + lp, 4),
                "is_done": token == eos_token_id,
            })
    candidates.sort(key=lambda c: (-c["score"], c["sequence"]))
    beams = candidates[:beam_width]
    return {"beams": beams, "all_done": all(b["is_done"] for b in beams)}
