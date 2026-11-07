import math

def moe_topk_routing(router_logits, top_k):
    m = max(router_logits)
    exps = [math.exp(x - m) for x in router_logits]
    total = sum(exps)
    probs = [e / total for e in exps]
    chosen = sorted(range(len(probs)), key=lambda i: (-probs[i], i))[:top_k]
    kept = sum(probs[i] for i in chosen)
    return [{"expert_idx": i, "weight": probs[i] / kept} for i in sorted(chosen)]
