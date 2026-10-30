import numpy as np
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    """
    ML-based Anomaly Detector (Isolation Forest).
    Monitors node telemetry (jitter, latency variance, drop history)
    to predict threat probability BEFORE tasks are executed.
    """
    def __init__(self):
        self.model = IsolationForest(contamination=0.2, random_state=42)
        # Seed with initial baseline normal telemetry
        baseline_data = np.random.normal(loc=[10.0, 0.05], scale=[2.0, 0.02], size=(100, 2))
        self.model.fit(baseline_data)

    def predict_threat_probability(self, latency: float, packet_loss_rate: float) -> float:
        """
        Returns a threat score between 0.0 (safe) and 1.0 (anomalous/rogue).
        """
        features = np.array([[latency, packet_loss_rate]])
        # decision_function: lower means more abnormal
        score = self.model.decision_function(features)[0]
        # Normalize to [0.0, 1.0] where 1.0 is high threat
        threat_prob = 1.0 / (1.0 + np.exp(score * 5.0))
        return float(np.clip(threat_prob, 0.0, 1.0))

class ExplainableAIEngine:
    """
    XAI Engine: Computes real-time decision rationales
    explaining why the DRL agent preferred one node over alternatives.
    """
    @staticmethod
    def explain_decision(chosen_node: int, candidate_nodes: list, task_criticality: float) -> dict:
        best = candidate_nodes[chosen_node]
        fastest = min(candidate_nodes, key=lambda n: n["latency"])
        
        reasons = []
        if fastest["node_id"] != chosen_node:
            reasons.append(
                f"Bypassed fastest Server {fastest['node_id']} ({fastest['latency']}ms) due to high threat risk ({fastest['threat_prob']*100:.1f}%)."
            )
        
        if task_criticality > 0.70:
            reasons.append(
                f"Enforced high-security protocol: Server {chosen_node} selected with high trust ({best['trust']:.2f})."
            )
        else:
            reasons.append(
                f"Balanced latency-throughput trade-off for low-criticality workload on Server {chosen_node}."
            )

        return {
            "chosen_node": chosen_node,
            "fastest_bypassed": fastest["node_id"] if fastest["node_id"] != chosen_node else None,
            "rationale": " ".join(reasons),
            "confidence_score": round(float(best["trust"] * (1.0 - best["threat_prob"]) * 100), 1)
        }