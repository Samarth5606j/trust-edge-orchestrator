# EdgeTrust AI: Trust-Aware Mobile Edge Computing Orchestrator

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat&logo=next.js)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/Deep%20RL-PyTorch-EE4C2C?style=flat&logo=pytorch)](https://pytorch.org/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

An enterprise-grade, dual-model edge orchestration platform that prevents cybersecurity breaches in Mobile Edge Computing (MEC) networks. By combining **Isolation Forest anomaly detection** for pre-execution threat prediction with a **Deep Q-Network (DQN)** for multi-objective resource allocation, EdgeTrust AI minimizes end-to-end task latency while strictly enforcing zero-trust integrity on mission-critical workloads.

---

## Key Highlights

- **Dual-Model Defense Pipeline:** Uses an Isolation Forest to evaluate packet latency variance and loss rate in real time, feeding threat probabilities directly into a Deep Q-Network state space.
- **Explainable AI (XAI) Inspector:** Provides deterministic, natural language decision attribution explaining why candidate edge servers were prioritized or rejected.
- **Interactive Adversary Sandbox:** Allows real-time injection of adversarial attacks (Constant Packet Drop, On-Off Sleeper, and Selective Tampering) to observe policy adaptation.
- **Full-Stack Streaming Architecture:** High-throughput async FastAPI backend broadcasting edge telemetry over WebSockets to a Next.js App Router frontend at 60 FPS.
- **Compliance & Audit Logging:** One-click forensic CSV export capturing complete execution traces, SLA verifications, and cryptographic trust ratings.

---

## System Architecture