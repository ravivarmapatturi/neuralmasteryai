def verify_speculative_tokens(draft_tokens, draft_probs, target_probs, random_samples):
    k = len(draft_tokens)
    if len(draft_probs) != k or len(random_samples) != k or len(target_probs) not in (k, k + 1):
        raise ValueError("input lengths do not match")
    def argmax(probs):
        return min(range(len(probs)), key=lambda i: (-probs[i], i))
    accepted = []
    for i, x in enumerate(draft_tokens):
        p_draft, p_target = draft_probs[i][x], target_probs[i][x]
        ratio = 1.0 if p_draft == 0 else min(1.0, p_target / p_draft)
        if random_samples[i] <= ratio:
            accepted.append(x)
            continue
        # Rejected: sample from the leftover mass max(0, target - draft).
        residual = [max(0.0, t - d) for t, d in zip(target_probs[i], draft_probs[i])]
        total = sum(residual)
        adjusted = [r / total for r in residual] if total > 0 else list(target_probs[i])
        return {"accepted_tokens": accepted, "bonus_token": argmax(adjusted), "acceptance_count": len(accepted)}
    bonus = argmax(target_probs[k]) if len(target_probs) > k else None
    return {"accepted_tokens": accepted, "bonus_token": bonus, "acceptance_count": len(accepted)}
