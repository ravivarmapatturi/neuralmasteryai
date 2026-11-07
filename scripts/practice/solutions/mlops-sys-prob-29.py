def page_hinkley_update(cumulative_sum, running_min, new_error, running_mean_error, delta):
    new_sum = cumulative_sum + (new_error - running_mean_error - delta)
    new_min = min(running_min, new_sum)
    return (new_sum, new_min, new_sum - new_min)
