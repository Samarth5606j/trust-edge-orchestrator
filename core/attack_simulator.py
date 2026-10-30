import numpy as np

class AttackSimulator:
    """
    Simulates adversarial behavior on edge nodes:
    - Constant Drop: Drops/compromises tasks at a fixed probability.
    - On-Off Attack: Behaves honestly when trust drops below a threshold to regain reputation,
      then attacks when trust is high.
    - Data Tampering: Completes task within SLA but corrupts data payloads on high-criticality tasks.
    """
    def __init__(self, mode="Constant Drop"):
        self.mode = mode
        self.step_count = 0

    def evaluate_behavior(self, node_id: int, base_malicious_prob: float, 
                          current_trust: float, task_criticality: float) -> tuple[bool, bool]:
        """
        Returns:
            is_malicious (bool): Whether the node executed an attack.
            data_corrupted (bool): Whether data payload was modified.
        """
        self.step_count += 1
        
        if self.mode == "Constant Drop":
            is_malicious = np.random.rand() < base_malicious_prob
            return is_malicious, is_malicious

        elif self.mode == "On-Off Attack":
            # If trust is high (>0.7), attack to exploit reputation.
            # If caught and trust falls (<0.45), act honestly to recover.
            if current_trust > 0.70:
                is_malicious = np.random.rand() < (base_malicious_prob * 1.3)
            elif current_trust < 0.45:
                is_malicious = False  # Lie low and build trust
            else:
                is_malicious = np.random.rand() < (base_malicious_prob * 0.5)
            return is_malicious, is_malicious

        elif self.mode == "Selective Tampering":
            # Only targets safety-critical tasks (criticality > 0.65)
            if task_criticality > 0.65:
                is_malicious = np.random.rand() < base_malicious_prob
                return is_malicious, True
            return False, False

        return False, False