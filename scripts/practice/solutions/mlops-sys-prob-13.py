def warmup_lr(step, warmup_steps, base_lr):
    if warmup_steps == 0 or step >= warmup_steps:
        return base_lr
    return base_lr * step / warmup_steps
