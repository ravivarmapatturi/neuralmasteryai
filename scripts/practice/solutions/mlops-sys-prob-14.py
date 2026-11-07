import math

def cosine_annealing_lr(step, total_steps, base_lr, min_lr=0.0):
    step = min(step, total_steps)
    return min_lr + 0.5 * (base_lr - min_lr) * (1 + math.cos(math.pi * step / total_steps))
