def merge_state_update(current_state, update, list_keys):
    merged = dict(current_state)  # never mutate the caller's state
    for key, value in update.items():
        if key in list_keys:
            merged[key] = list(current_state.get(key, [])) + list(value)
        else:
            merged[key] = value
    return merged
