import numpy as np
from core.trust_engine import TrustEngine
from core.ai_engine import AnomalyDetector, ExplainableAIEngine

class EnterpriseEdgeEnv:
    def __init__(self, num_nodes=5):
        self.num_nodes = num_nodes
        self.trust_engine = TrustEngine(num_nodes=num_nodes)
        self.anomaly_detector = AnomalyDetector()
        self.xai_engine = ExplainableAIEngine()

        self.node_profiles = [
            {"base_latency": 10.0, "malicious_prob": 0.0, "loss_rate": 0.01},
            {"base_latency": 15.0, "malicious_prob": 0.0, "loss_rate": 0.02},
            {"base_latency": 8.0,  "malicious_prob": 0.75, "loss_rate": 0.35},  # Target honeypot
            {"base_latency": 25.0, "malicious_prob": 0.0, "loss_rate": 0.01},
            {"base_latency": 12.0, "malicious_prob": 0.40, "loss_rate": 0.15},
        ]
        self.capacities = np.ones(num_nodes, dtype=np.float32)
        self.attack_mode = "CONSTANT"  # "CONSTANT", "ON_OFF", or "SELECTIVE"

    def get_cluster_snapshot(self):
        trust_scores = self.trust_engine.get_trust_scores()
        snapshot = []
        for i in range(self.num_nodes):
            profile = self.node_profiles[i]
            latency = profile["base_latency"] + np.random.normal(0, 0.8)
            threat_p = self.anomaly_detector.predict_threat_probability(latency, profile["loss_rate"])
            
            if trust_scores[i] < 0.45 or threat_p > 0.65:
                status = "QUARANTINED" if trust_scores[i] < 0.30 else "THREAT_DETECTED"
            elif trust_scores[i] < 0.70:
                status = "DEGRADED"
            else:
                status = "SECURE"

            snapshot.append({
                "node_id": i,
                "latency": round(float(latency), 1),
                "trust": round(float(trust_scores[i]), 2),
                "capacity": round(float(self.capacities[i]), 2),
                "threat_prob": round(float(threat_p), 2),
                "status": status
            })
        return snapshot

    def step(self, action: int, task: dict):
        selected = action
        snapshot = self.get_cluster_snapshot()
        node_data = snapshot[selected]
        trust_scores = self.trust_engine.get_trust_scores()

        # Multi-attack evaluation logic
        base_prob = self.node_profiles[selected]["malicious_prob"]
        if selected == 2 and base_prob > 0.0:
            if self.attack_mode == "ON_OFF":
                # Sleeper mode: attack only when trust is high
                is_malicious = (trust_scores[selected] >= 0.60) and (np.random.rand() < base_prob)
            elif self.attack_mode == "SELECTIVE":
                # Only tamper with safety-critical workloads
                is_malicious = (task["criticality"] > 0.65) and (np.random.rand() < base_prob)
            else:
                is_malicious = np.random.rand() < base_prob
        else:
            is_malicious = np.random.rand() < base_prob

        meets_sla = (node_data["latency"] <= task["deadline"]) and (node_data["capacity"] >= task["compute"])
        security_breach = is_malicious and (task["criticality"] > 0.50)

        success = meets_sla and not security_breach
        self.trust_engine.update(selected, success=success, is_compromised=security_breach)
        
        self.capacities = np.clip(self.capacities + 0.15, 0.2, 1.0)
        self.capacities[selected] = max(0.1, self.capacities[selected] - task["compute"])

        explanation = self.xai_engine.explain_decision(selected, snapshot, task["criticality"])

        return {
            "task": task,
            "chosen_node": selected,
            "latency": node_data["latency"],
            "trust": node_data["trust"],
            "security_breach": bool(security_breach),
            "meets_sla": bool(meets_sla),
            "xai": explanation,
            "cluster_state": snapshot
        }