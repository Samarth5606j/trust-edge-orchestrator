import gymnasium as gym
from gymnasium import spaces
import numpy as np
from core.trust_engine import TrustEngine

class EdgeComputingEnv(gym.Env):
    def __init__(self, num_nodes=5):
        super().__init__()
        self.num_nodes = num_nodes
        self.trust_engine = TrustEngine(num_nodes=num_nodes)

        # Action: Choose edge node [0, ..., num_nodes-1]
        self.action_space = spaces.Discrete(self.num_nodes)

        # State: Task [CPU_req, Latency_max, Security_level] + Nodes [CPU_avail, Latency, Trust] * M
        # Length: 3 + (3 * num_nodes)
        self.state_dim = 3 + (3 * self.num_nodes)
        self.observation_space = spaces.Box(
            low=0.0, high=100.0, shape=(self.state_dim,), dtype=np.float32
        )

        # Configure node profiles: (Base_Latency_ms, Is_Malicious)
        self.node_profiles = [
            {"base_latency": 10.0, "malicious_prob": 0.0},
            {"base_latency": 15.0, "malicious_prob": 0.0},
            {"base_latency": 8.0,  "malicious_prob": 0.6},  # Fast but compromised / rogue node
            {"base_latency": 25.0, "malicious_prob": 0.0},
            {"base_latency": 12.0, "malicious_prob": 0.4},  # On-off attacker
        ]
        self.reset()

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.trust_engine.reset()
        self.node_capacities = np.random.uniform(0.6, 1.0, size=self.num_nodes).astype(np.float32)
        self.current_task = self._generate_task()
        return self._get_obs(), {}

    def _generate_task(self):
        # [Compute_Size (0.1 to 0.4), Deadline_ms (12 to 50), Security_Req (0.2 to 0.9)]
        return np.array([
            np.random.uniform(0.1, 0.4),
            np.random.uniform(15.0, 45.0),
            np.random.uniform(0.3, 0.85)
        ], dtype=np.float32)

    def _get_obs(self):
        trust_scores = self.trust_engine.get_trust_scores()
        node_features = []
        for i in range(self.num_nodes):
            current_latency = self.node_profiles[i]["base_latency"] + np.random.normal(0, 1.5)
            node_features.extend([self.node_capacities[i], max(1.0, current_latency), trust_scores[i]])
        return np.concatenate([self.current_task, node_features]).astype(np.float32)

    def step(self, action):
        cpu_req, deadline, sec_req = self.current_task
        selected_node = action
        trust_scores = self.trust_engine.get_trust_scores()
        node_trust = trust_scores[selected_node]
        node_lat = self.node_profiles[selected_node]["base_latency"]
        node_cap = self.node_capacities[selected_node]

        # Simulate execution and security compromise
        is_malicious = np.random.rand() < self.node_profiles[selected_node]["malicious_prob"]
        meets_sla = (node_lat <= deadline) and (node_cap >= cpu_req)
        security_breach = is_malicious and (sec_req > 0.5)

        success = meets_sla and not security_breach

        # Reward calculation: Balance QoS against Trust & Security
        if security_breach:
            reward = -20.0  # Heavy penalty for compromising sensitive task
        elif not meets_sla:
            reward = -8.0   # SLA violation penalty
        else:
            # Balanced reward: High trust + Low latency
            reward = (node_trust * 6.0) - (node_lat / 10.0)

        # Update node internal trust and recharge CPU capacity
        self.trust_engine.update(selected_node, success=success, is_compromised=security_breach)
        self.node_capacities = np.clip(self.node_capacities + 0.15 - (0.3 if selected_node == action else 0.0), 0.1, 1.0)

        info = {
            "node": selected_node,
            "success": success,
            "security_breach": security_breach,
            "meets_sla": meets_sla,
            "latency": node_lat,
            "trust": node_trust
        }

        self.current_task = self._generate_task()
        return self._get_obs(), reward, False, False, info
