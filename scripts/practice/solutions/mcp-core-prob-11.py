TRANSITIONS = {
    ("uninitialized", "initialize"): "initializing",
    ("initializing", "initialized"): "ready",
    ("ready", "shutdown"): "shutting_down",
    ("shutting_down", "exit"): "closed",
}

def session_transition(current_state, event):
    if event == "error":
        return "closed"
    return TRANSITIONS.get((current_state, event), current_state)
