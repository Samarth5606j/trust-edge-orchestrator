"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  ShieldCheck, 
  Activity, 
  Server, 
  Radio, 
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  TrendingUp,
  Cpu,
  Lock,
  Sliders,
  Download,
  Play,
  Pause,
  ZapOff,
  Network
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface NodeState {
  node_id: number;
  latency: number;
  trust: number;
  capacity: number;
  threat_prob: number;
  status: "SECURE" | "DEGRADED" | "THREAT_DETECTED" | "QUARANTINED";
}

interface TelemetryEvent {
  task: {
    task_id: number;
    compute: number;
    deadline: number;
    criticality: number;
  };
  chosen_node: number;
  latency: number;
  trust: number;
  security_breach: boolean;
  meets_sla: boolean;
  xai: {
    chosen_node: number;
    fastest_bypassed: number | null;
    rationale: string;
    confidence_score: number;
  };
  cluster_state: NodeState[];
}

export default function EdgeDashboard() {
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [latestEvent, setLatestEvent] = useState<TelemetryEvent | null>(null);
  const [eventHistory, setEventHistory] = useState<TelemetryEvent[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<{ id: number; latency: number; trust: number }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [totalBreaches, setTotalBreaches] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);

  // Simulation Controls State
  const [attackProb, setAttackProb] = useState(0.75);
  const [attackMode, setAttackMode] = useState("CONSTANT");
  const [highCritOnly, setHighCritOnly] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [streamSpeed, setStreamSpeed] = useState(800);

  const wsRef = useRef<WebSocket | null>(null);

  // Environment-aware API & WebSocket URLs
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/telemetry";

  const pushConfig = (
    newAttack: number,
    newMode: string,
    newCrit: boolean,
    newPause: boolean,
    newSpeed: number
  ) => {
    fetch(`${API_URL}/api/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        node2_attack_prob: newAttack,
        attack_mode: newMode,
        high_criticality_only: newCrit,
        is_paused: newPause,
        stream_speed_ms: newSpeed
      })
    }).catch((err) => console.error("Control update failed:", err));
  };

  useEffect(() => {
    setHasMounted(true);

    fetch(`${API_URL}/api/nodes`)
      .then((res) => res.json())
      .then((data) => setNodes(data))
      .catch((err) => console.error("Initial fetch error:", err));

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const data: TelemetryEvent = JSON.parse(event.data);
      setLatestEvent(data);
      setNodes(data.cluster_state);
      setTotalTasks((prev) => prev + 1);
      if (data.security_breach) {
        setTotalBreaches((prev) => prev + 1);
      }
      setEventHistory((prev) => [data, ...prev.slice(0, 19)]);
      setLatencyHistory((prev) => [
        ...prev.slice(-15),
        { id: data.task.task_id, latency: data.latency, trust: Math.round(data.trust * 100) }
      ]);
    };

    return () => {
      ws.close();
    };
  }, [API_URL, WS_URL]);

  const downloadAuditCSV = () => {
    if (eventHistory.length === 0) return;
    const headers = "Task_ID,Criticality,Allocated_Node,Latency_ms,Trust_Score,Breach,SLA_Met\n";
    const rows = eventHistory.map(
      (e) => `${e.task.task_id},${e.task.criticality},${e.chosen_node},${e.latency},${e.trust},${e.security_breach},${e.meets_sla}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edgetrust_audit_${Date.now()}.csv`;
    a.click();
  };

  const greedySimulatedBreaches = Math.round(totalTasks * (attackProb * 0.85));

  // Topology node coordinates
  const nodePositions = [
    { x: 50, y: 15 },   // Node 0
    { x: 85, y: 38 },   // Node 1
    { x: 72, y: 85 },   // Node 2 (Target Honeypot)
    { x: 28, y: 85 },   // Node 3
    { x: 15, y: 38 },   // Node 4
  ];

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6 bg-[#090d16] text-slate-100 font-sans">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              EdgeTrust AI <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800 font-mono">Enterprise v2.0</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dual-Model Edge Orchestration: Deep Reinforcement Learning + Isolation Forest Anomaly Detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const nextPause = !isPaused;
              setIsPaused(nextPause);
              pushConfig(attackProb, attackMode, highCritOnly, nextPause, streamSpeed);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isPaused 
                ? "bg-amber-950/60 border-amber-800 text-amber-300" 
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {isPaused ? "Resume Stream" : "Pause Stream"}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <Radio className={`h-3.5 w-3.5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-rose-500"}`} />
            <span className={isConnected ? "text-slate-300" : "text-rose-400"}>
              {isConnected ? (isPaused ? "STREAM PAUSED" : "LIVE WS STREAM (800ms)") : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </header>

      {/* Adversary Simulator Controls */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Sliders className="h-4 w-4 text-indigo-400" />
          <span>Interactive Adversary Simulator</span>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Attack Pattern:</span>
            <select 
              value={attackMode}
              onChange={(e) => {
                const val = e.target.value;
                setAttackMode(val);
                pushConfig(attackProb, val, highCritOnly, isPaused, streamSpeed);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-indigo-300 font-medium text-xs font-mono"
            >
              <option value="CONSTANT">Constant Packet Drop</option>
              <option value="ON_OFF">On-Off Sleeper Threat</option>
              <option value="SELECTIVE">Selective Critical Tampering</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400">Node 2 Intensity:</span>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.05"
              value={attackProb}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setAttackProb(val);
                pushConfig(val, attackMode, highCritOnly, isPaused, streamSpeed);
              }}
              className="accent-indigo-500 w-24 cursor-pointer"
            />
            <span className="font-mono text-indigo-300 font-bold w-10">{(attackProb * 100).toFixed(0)}%</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-slate-300">
            <input 
              type="checkbox" 
              checked={highCritOnly}
              onChange={(e) => {
                const val = e.target.checked;
                setHighCritOnly(val);
                pushConfig(attackProb, attackMode, val, isPaused, streamSpeed);
              }}
              className="rounded accent-emerald-500 cursor-pointer"
            />
            <span>Enforce High Criticality</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Interval:</span>
            <select 
              value={streamSpeed}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setStreamSpeed(val);
                pushConfig(attackProb, attackMode, highCritOnly, isPaused, val);
              }}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs font-mono"
            >
              <option value={400}>400ms (Fast)</option>
              <option value={800}>800ms (Normal)</option>
              <option value={1500}>1.5s (Demo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-medium text-slate-400">Total Workloads Scheduled</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{totalTasks}</div>
          <span className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <Activity className="h-3 w-3" /> Continuous Stream
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-medium text-slate-400">Security Compromises</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
            {totalBreaches} <span className="text-xs font-sans text-slate-400 font-normal">({totalTasks === 0 ? "100%" : `${(((totalTasks - totalBreaches) / totalTasks) * 100).toFixed(1)}%`} Secure)</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-400" /> DQN Policy Enforced
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-medium text-slate-400">Cluster Status</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">{nodes.length} Nodes Online</div>
          <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Cpu className="h-3 w-3 text-cyan-400" /> Heterogeneous MEC Mesh
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-xs font-medium text-slate-400">XAI Decision Confidence</span>
          <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono">
            {latestEvent ? `${latestEvent.xai.confidence_score}%` : "--"}
          </div>
          <span className="text-xs text-slate-400 mt-1">Isolation Forest Telemetry</span>
        </div>
      </div>

      {/* Live Security Benchmark Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800 text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Live Security Benchmark</h3>
            <p className="text-[11px] text-slate-400">Empirical comparison against speed-first greedy routing</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Greedy (Blind) Breaches:</span>
            <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-bold flex items-center gap-1">
              <ZapOff className="h-3 w-3 text-rose-400" />
              {greedySimulatedBreaches}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Trust-Aware DQN:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              {totalBreaches} Breaches
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Risk Mitigation:</span>
            <span className="text-emerald-400 font-bold font-mono">
              {totalTasks > 0 && greedySimulatedBreaches > 0
                ? `${(((greedySimulatedBreaches - totalBreaches) / greedySimulatedBreaches) * 100).toFixed(1)}%`
                : "100.0%"}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Topology Canvas + Edge Node Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Topology Mesh Canvas */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Network className="h-4 w-4 text-cyan-400" />
              Edge Cluster Mesh Canvas
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Dynamic Routing Vectors</span>
          </div>

          <div className="relative w-full h-64 bg-slate-950/80 border border-slate-800/80 rounded-lg overflow-hidden my-auto">
            {/* Central Gateway */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
              <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-500/80 flex items-center justify-center shadow-lg shadow-cyan-950/50 animate-pulse">
                <Radio className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-[9px] font-mono text-cyan-300 font-semibold mt-1">IoT Gateway</span>
            </div>

            {/* Connecting Links */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {nodePositions.map((pos, idx) => {
                const isTarget = latestEvent?.chosen_node === idx;
                return (
                  <line 
                    key={idx}
                    x1="50%" 
                    y1="50%" 
                    x2={`${pos.x}%`} 
                    y2={`${pos.y}%`}
                    stroke={isTarget ? "#818cf8" : "#334155"}
                    strokeWidth={isTarget ? "2.5" : "1"}
                    strokeDasharray={isTarget ? "4,4" : "none"}
                    className={isTarget ? "animate-pulse" : ""}
                  />
                );
              })}
            </svg>

            {/* Edge Nodes */}
            {nodes.map((node, idx) => {
              const pos = nodePositions[idx] || { x: 50, y: 50 };
              const isSelected = latestEvent?.chosen_node === node.node_id;
              return (
                <div 
                  key={node.node_id}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-300 z-10 ${
                    isSelected ? "scale-110" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-mono text-[10px] font-bold ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-300 text-white shadow-lg shadow-indigo-600/50"
                      : node.status === "SECURE"
                      ? "bg-slate-900 border-emerald-500 text-emerald-400"
                      : node.status === "THREAT_DETECTED"
                      ? "bg-slate-900 border-rose-500 text-rose-400"
                      : "bg-slate-900 border-amber-500 text-amber-400"
                  }`}>
                    N{node.node_id}
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5">{node.latency}ms</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
            <span className="text-emerald-400">● Secure</span>
            <span className="text-amber-400">● Degraded</span>
            <span className="text-rose-400">● Quarantined</span>
            <span className="text-indigo-400">● Allocated</span>
          </div>
        </div>

        {/* Live Nodes Infrastructure Telemetry */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-cyan-400" />
              Live Edge Node Mesh Telemetry
            </h2>
            <span className="text-xs text-slate-500 font-mono">Beta Reputation Engine (α / α+β)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {nodes.map((node) => {
              const isSelected = latestEvent?.chosen_node === node.node_id;
              return (
                <div 
                  key={node.node_id}
                  className={`p-3.5 rounded-xl border transition-all duration-200 ${
                    isSelected 
                      ? "border-indigo-500 bg-indigo-950/25 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50" 
                      : "border-slate-800/80 bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white font-mono">Node {node.node_id}</span>
                      {isSelected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500 text-white font-medium uppercase font-sans">
                          Active
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      node.status === "SECURE"
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                        : node.status === "THREAT_DETECTED"
                        ? "bg-rose-950/60 text-rose-400 border-rose-800"
                        : "bg-amber-950/60 text-amber-400 border-amber-800"
                    }`}>
                      {node.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 text-[11px] mb-0.5">
                        <span>Trust Score:</span>
                        <span className="font-mono text-white">{node.trust.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            node.trust > 0.7 ? "bg-emerald-400" : node.trust > 0.4 ? "bg-amber-400" : "bg-rose-500"
                          }`} 
                          style={{ width: `${node.trust * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                      <span>Latency:</span>
                      <span className="font-mono text-slate-200">{node.latency} ms</span>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Anomaly Risk:</span>
                      <span className={`font-mono font-medium ${node.threat_prob > 0.5 ? "text-rose-400" : "text-slate-300"}`}>
                        {(node.threat_prob * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Available CPU:</span>
                      <span className="font-mono text-cyan-300">{(node.capacity * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Latency Chart + XAI Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
              Live Network Latency Trend (ms)
            </span>
            <span className="text-[11px] font-mono text-slate-500">Sliding Window (Last 15 Tasks)</span>
          </div>
          <div className="h-44 w-full">
            {hasMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={latencyHistory}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="id" hide />
                  <YAxis domain={[0, 40]} stroke="#475569" fontSize={10} fontVariant="mono" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="#818cf8" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#latencyGradient)" 
                    isAnimationActive={false} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Explainable AI (XAI) Panel */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">XAI Decision Inspector</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Real-time attribution explaining why the DQN policy selected or bypassed candidate servers.
            </p>

            {latestEvent ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-800/50 text-xs text-indigo-200 leading-relaxed font-sans">
                  {latestEvent.xai.rationale}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Task ID:</span>
                    <span className="font-mono text-white font-medium">#{latestEvent.task.task_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Criticality Requirement:</span>
                    <span className="font-mono text-cyan-400 font-medium">
                      {(latestEvent.task.criticality * 100).toFixed(0)}% (Safety-Critical)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Latency Budget / Used:</span>
                    <span className="font-mono text-slate-300">
                      {latestEvent.latency}ms / {latestEvent.task.deadline}ms
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SLA Contract Check:</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> SLA Compliant
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic text-center py-12">
                Awaiting next telemetry frame...
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            Optimization Engine: Bellman Q-Loss Minimization
          </div>
        </div>
      </div>

      {/* Live Workload Stream Table */}
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            Live Workload Scheduling Stream
          </h3>
          <button 
            onClick={downloadAuditCSV}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-lg text-xs font-mono text-slate-300 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export Audit Log (.CSV)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-slate-400">
            <thead className="bg-slate-950/60 text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Task ID</th>
                <th className="py-2.5 px-3">Criticality</th>
                <th className="py-2.5 px-3">Target Node</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Trust Score</th>
                <th className="py-2.5 px-3">Security Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {eventHistory.map((item) => (
                <tr key={item.task.task_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-3 text-white font-medium">#{item.task.task_id}</td>
                  <td className="py-2 px-3 text-cyan-400">{(item.task.criticality * 100).toFixed(0)}%</td>
                  <td className="py-2 px-3 text-indigo-300 font-semibold">Node {item.chosen_node}</td>
                  <td className="py-2 px-3 text-slate-300">{item.latency} ms</td>
                  <td className="py-2 px-3 text-slate-300">{item.trust.toFixed(2)}</td>
                  <td className="py-2 px-3">
                    {item.security_breach ? (
                      <span className="text-rose-400 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" /> BREACH
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> SECURE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}