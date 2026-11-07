def supervisor_route(task_category, worker_specialties, default_worker):
    for worker in sorted(worker_specialties):
        if task_category in worker_specialties[worker]:
            return worker
    return default_worker
