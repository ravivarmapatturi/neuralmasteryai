def fan_in_aggregate(branch_results, aggregation_key):
    return [branch_results[b][aggregation_key] for b in sorted(branch_results) if aggregation_key in branch_results[b]]
