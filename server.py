from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import numpy as np

from core.enterprise_env import EnterpriseEdgeEnv
from models.dqn_agent import DQNAgent

app = FastAPI(title="EdgeTrust Enterprise AI Orchestrator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

env = EnterpriseEdgeEnv()
state_dim = 3 + (3 * env.num_nodes)
agent = DQNAgent(state_dim=state_dim, action_dim=env.num_nodes)

try:
    agent.load("dqn_model.pth")
    print("[✓] Pretrained DQN model loaded successfully.")
except Exception as e:
    print(f"[!] Warning: Could not load dqn_model.pth: {e}")

control_state = {
    "node2_attack_prob": 0.75,
    "attack_mode": "CONSTANT",
    "high_criticality_only": True,
    "stream_speed_ms": 800,
    "is_paused": False
}

class ControlUpdate(BaseModel):
    node2_attack_prob: float
    attack_mode: str
    high_criticality_only: bool
    stream_speed_ms: int
    is_paused: bool

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "mode": "Enterprise Dual-Model (DRL + Anomaly Detection)"}

@app.get("/api/nodes")
def get_nodes():
    return env.get_cluster_snapshot()

@app.post("/api/control")
def update_control(cfg: ControlUpdate):
    control_state["node2_attack_prob"] = cfg.node2_attack_prob
    control_state["attack_mode"] = cfg.attack_mode
    control_state["high_criticality_only"] = cfg.high_criticality_only
    control_state["stream_speed_ms"] = cfg.stream_speed_ms
    control_state["is_paused"] = cfg.is_paused

    env.node_profiles[2]["malicious_prob"] = cfg.node2_attack_prob
    env.attack_mode = cfg.attack_mode
    return {"status": "SUCCESS", "current_config": control_state}

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    print("[+] Client connected to live telemetry stream.")
    task_id = 0
    try:
        while True:
            if control_state["is_paused"]:
                await asyncio.sleep(0.3)
                continue

            task_id += 1
            if control_state["high_criticality_only"]:
                crit = round(float(np.random.uniform(0.70, 0.95)), 2)
            else:
                crit = round(float(np.random.uniform(0.15, 0.55)), 2)

            task = {
                "task_id": task_id,
                "compute": round(float(np.random.uniform(0.1, 0.35)), 2),
                "deadline": round(float(np.random.uniform(18.0, 45.0)), 1),
                "criticality": crit
            }

            trust_scores = env.trust_engine.get_trust_scores()
            task_feat = [task["compute"], task["deadline"], task["criticality"]]
            node_feat = []
            for i in range(env.num_nodes):
                node_feat.extend([env.capacities[i], env.node_profiles[i]["base_latency"], trust_scores[i]])
            state = np.array(task_feat + node_feat, dtype=np.float32)

            action = agent.act(state, explore=False)
            result = env.step(action, task)

            await websocket.send_text(json.dumps(result))
            await asyncio.sleep(control_state["stream_speed_ms"] / 1000.0)
    except WebSocketDisconnect:
        print("[-] Client disconnected from telemetry stream.")