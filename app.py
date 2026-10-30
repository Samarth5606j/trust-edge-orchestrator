import streamlit as st
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import networkx as nx

from core.environment import EdgeComputingEnv
from core.attack_simulator import AttackSimulator
from models.dqn_agent import DQNAgent
from models.baselines import BaselineAllocators

st.set_page_config(page_title="Trust-Aware Edge Orchestrator", layout="wide")

st.title("🛡️ Trust-Aware Edge Computing Resource Allocator")
st.caption("Deep Reinforcement Learning vs. Classical Heuristics under Dynamic Cyber Threats")

# --- Sidebar Controls ---
st.sidebar.header("⚙️ Simulation Controls")
attack_mode = st.sidebar.selectbox(
    "Adversarial Strategy",
    ["Constant Drop", "On-Off Attack", "Selective Tampering"]
)
attack_intensity = st.sidebar.slider("Node 2 Malicious Attack Probability", 0.0, 1.0, 0.75, 0.05)
task_criticality_boost = st.sidebar.checkbox("Enforce High Task Criticality (Safety-Critical)", value=True)

# Initialize Engine
env = EdgeComputingEnv()
env.node_profiles[2]["malicious_prob"] = attack_intensity
attacker = AttackSimulator(mode=attack_mode)
agent = DQNAgent(state_dim=env.state_dim, action_dim=env.action_space.n)

try:
    agent.load("dqn_model.pth")
    st.sidebar.success("✅ Pretrained DQN Weights Loaded")
except Exception:
    st.sidebar.warning("⚠️ No dqn_model.pth found. Run run_benchmark.py first.")

# --- Network Topology Visualizer Function ---
def build_topology_figure(num_nodes, trust_scores, last_assigned_node):
    G = nx.Graph()
    G.add_node("Client Gateway", pos=(0, 0))
    pos = {"Client Gateway": (0, 0)}
    
    node_x, node_y = [0], [0]
    node_colors = ["#1f77b4"]
    hover_texts = ["IoT Client Gateway"]

    angles = np.linspace(0, 2 * np.pi, num_nodes, endpoint=False)
    for i in range(num_nodes):
        name = f"Edge-Node {i}"
        pos[name] = (np.cos(angles[i]), np.sin(angles[i]))
        G.add_edge("Client Gateway", name)
        
        node_x.append(pos[name][0])
        node_y.append(pos[name][1])
        t_val = trust_scores[i]
        
        # Color coding: Green = Trusted, Orange = Suspect, Red = Compromised
        color = "#00CC96" if t_val >= 0.7 else ("#FFA15A" if t_val >= 0.45 else "#EF553B")
        if i == last_assigned_node:
            color = "#AB63FA"  # Highlight active choice in Purple
            
        node_colors.append(color)
        hover_texts.append(f"Server {i} | Trust Score: {t_val:.2f} | Latency: {env.node_profiles[i]['base_latency']}ms")

    edge_x, edge_y = [], []
    for edge in G.edges():
        x0, y0 = pos[edge[0]]
        x1, y1 = pos[edge[1]]
        edge_x.extend([x0, x1, None])
        edge_y.extend([y0, y1, None])

    edge_trace = go.Scatter(x=edge_x, y=edge_y, line=dict(width=1.5, color='#aaa'), hoverinfo='none', mode='lines')
    node_trace = go.Scatter(
        x=node_x, y=node_y, mode='markers+text',
        text=["GW"] + [f"N{i}" for i in range(num_nodes)],
        textposition="bottom center",
        marker=dict(size=[30] + [22]*num_nodes, color=node_colors, line_width=2),
        hovertext=hover_texts, hoverinfo='text'
    )

    fig = go.Figure(data=[edge_trace, node_trace], layout=go.Layout(
        title="Live Edge Network Topology (Purple = Selected Node)",
        showlegend=False, margin=dict(b=20, l=20, r=20, t=40),
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        height=320
    ))
    return fig

# --- Execution Dashboard ---
if st.button("🚀 Run Live Multi-Algorithm Evaluation (40 Tasks)"):
    records = []
    dqn_breaches, greedy_breaches, rr_breaches, thresh_breaches = 0, 0, 0, 0
    state, _ = env.reset()

    for step in range(40):
        if task_criticality_boost:
            env.current_task[2] = np.random.uniform(0.70, 0.95)
        crit = env.current_task[2]

        # 1. DQN Allocation
        dqn_act = agent.act(state, explore=False)
        _, _, _, _, d_info = env.step(dqn_act)
        is_mal, _ = attacker.evaluate_behavior(dqn_act, env.node_profiles[dqn_act]["malicious_prob"], d_info["trust"], crit)
        if is_mal and crit > 0.5: dqn_breaches += 1

        # 2. Greedy Baseline
        g_act = BaselineAllocators.greedy_latency(env)
        g_trust = env.trust_engine.get_trust_scores()[g_act]
        g_mal, _ = attacker.evaluate_behavior(g_act, env.node_profiles[g_act]["malicious_prob"], g_trust, crit)
        if g_mal and crit > 0.5: greedy_breaches += 1

        # 3. Round Robin Baseline
        rr_act = BaselineAllocators.round_robin(step, env.num_nodes)
        rr_trust = env.trust_engine.get_trust_scores()[rr_act]
        rr_mal, _ = attacker.evaluate_behavior(rr_act, env.node_profiles[rr_act]["malicious_prob"], rr_trust, crit)
        if rr_mal and crit > 0.5: rr_breaches += 1

        # 4. Static Filter Baseline
        th_act = BaselineAllocators.static_threshold(env, threshold=0.60)
        th_trust = env.trust_engine.get_trust_scores()[th_act]
        th_mal, _ = attacker.evaluate_behavior(th_act, env.node_profiles[th_act]["malicious_prob"], th_trust, crit)
        if th_mal and crit > 0.5: thresh_breaches += 1

        records.append({
            "Task_ID": step + 1,
            "Criticality": round(crit, 2),
            "DQN_Node": dqn_act,
            "DQN_Trust": round(d_info["trust"], 2),
            "DQN_Latency_ms": d_info["latency"],
            "Security_Compromise": is_mal and crit > 0.5
        })

    # Summary Visualizations
    col1, col2 = st.columns([1, 1])

    with col1:
        st.subheader("Security Failure Comparison (Lower is Better)")
        algos = ['Greedy (Blind)', 'Round Robin', 'Static Threshold (0.6)', 'Trust-Aware DQN']
        breaches = [greedy_breaches, rr_breaches, thresh_breaches, dqn_breaches]
        colors = ['#EF553B', '#FFA15A', '#AB63FA', '#00CC96']
        
        fig_bar = go.Figure(data=[go.Bar(x=algos, y=breaches, marker_color=colors)])
        fig_bar.update_layout(yaxis_title="Total Security Breaches", height=320)
        st.plotly_chart(fig_bar, use_container_width=True)

    with col2:
        last_node = records[-1]["DQN_Node"]
        st.plotly_chart(build_topology_figure(env.num_nodes, env.trust_engine.get_trust_scores(), last_node), use_container_width=True)

    # Historical Data Table & Download
    st.markdown("### 📊 Task Execution Audit Log")
    df_records = pd.DataFrame(records)
    st.dataframe(df_records.tail(8), use_container_width=True)

    # Downloadable Artifact for Examiner/Report
    csv_data = df_records.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Download Full Evaluation Audit Log (CSV)",
        data=csv_data,
        file_name="edge_allocation_audit.csv",
        mime="text/csv"
    )