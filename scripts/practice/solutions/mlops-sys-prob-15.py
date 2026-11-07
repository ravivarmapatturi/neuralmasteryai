def should_stop_early(val_losses, patience, min_delta=0.0):
    best, waited = float("inf"), 0
    for loss in val_losses:
        if loss < best - min_delta:
            best, waited = loss, 0
        else:
            waited += 1
            if waited >= patience:
                return True
    return False
