import numpy as np
import pandas as pd
from core.environment import EdgeComputingEnv
from models.dqn_agent import DQNAgent

def run_benchmarks(episodes=600):
    env = EdgeComputingEnv()
    agent = DQNAgent(state_dim=env.state_dim, action_dim=env.action_space.n)

    # 1. Train DQN Agent
    print("[*] Training Trust-Aware DQN Agent...")
    for ep in range(episodes):
        state, _ = env.reset()
        for _ in range(50):
            action = agent.act(state)
            next_state, reward, _, _, _ = env.step(action)
            agent.store(state, action, reward, next_state, False)
            agent.train_step()
            state = next_state
        if ep % 20 == 0:
            agent.update_target()

    agent.save("dqn_model.pth")
    print("[✓] Model trained and saved as dqn_model.pth")

    # 2. Evaluate Strategies Head-to-Head
    test_steps = 300
    metrics = {"Greedy_Latency": {"breaches": 0, "violations": 0, "avg_lat": []},
               "Trust_Aware_DQN": {"breaches": 0, "violations": 0, "avg_lat": []}}

    # Greedy Latency Allocator (Trust-Unaware)
    state, _ = env.reset()
    for _ in range(test_steps):
        # Choose node with lowest base latency regardless of trust
        action = int(np.argmin([p["base_latency"] for p in env.node_profiles]))
        _, _, _, _, info = env.step(action)
        if info["security_breach"]: metrics["Greedy_Latency"]["breaches"] += 1
        if not info["meets_sla"]: metrics["Greedy_Latency"]["violations"] += 1
        metrics["Greedy_Latency"]["avg_lat"].append(info["latency"])

    # Trust-Aware DQN
    state, _ = env.reset()
    for _ in range(test_steps):
        action = agent.act(state, explore=False)
        state, _, _, _, info = env.step(action)
        if info["security_breach"]: metrics["Trust_Aware_DQN"]["breaches"] += 1
        if not info["meets_sla"]: metrics["Trust_Aware_DQN"]["violations"] += 1
        metrics["Trust_Aware_DQN"]["avg_lat"].append(info["latency"])

    df = pd.DataFrame({
        "Algorithm": ["Greedy Latency (Trust-Blind)", "Trust-Aware DQN (Proposed)"],
        "Security Breaches": [metrics["Greedy_Latency"]["breaches"], metrics["Trust_Aware_DQN"]["breaches"]],
        "SLA Violations": [metrics["Greedy_Latency"]["violations"], metrics["Trust_Aware_DQN"]["violations"]],
        "Avg Latency (ms)": [np.mean(metrics["Greedy_Latency"]["avg_lat"]), np.mean(metrics["Trust_Aware_DQN"]["avg_lat"])]
    })
    print("\n=== Benchmark Results ===")
    print(df.to_string(index=False))
    df.to_csv("benchmark_results.csv", index=False)

if __name__ == "__main__":
    run_benchmarks()