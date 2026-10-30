import numpy as np

class TrustEngine:
    """
    Computes reputation using a Beta-Distribution prior:
    Trust = (alpha) / (alpha + beta)
    where alpha = successful interactions + 1, beta = failed/compromised + 1.
    """
    def __init__(self, num_nodes: int, decay_factor: float = 0.95):
        self.num_nodes = num_nodes
        self.decay_factor = decay_factor
        self.alpha = np.ones(num_nodes, dtype=np.float32)  # Prior successes = 1
        self.beta = np.ones(num_nodes, dtype=np.float32)   # Prior failures = 1

    def get_trust_scores(self) -> np.ndarray:
        return self.alpha / (self.alpha + self.beta)

    def update(self, node_id: int, success: bool, is_compromised: bool):
        # Apply time decay to historical interactions
        self.alpha[node_id] *= self.decay_factor
        self.beta[node_id] *= self.decay_factor

        if success and not is_compromised:
            self.alpha[node_id] += 1.0
        else:
            # Harsh penalty for malicious or broken execution
            self.beta[node_id] += 3.0

    def reset(self):
        self.alpha = np.ones(self.num_nodes, dtype=np.float32)
        self.beta = np.ones(self.num_nodes, dtype=np.float32)