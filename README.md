# Trust Edge Orchestrator

A small research scaffold for selecting edge nodes using latency, Beta reputation, and attack simulation.

## Setup

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
```

## Run the dashboard

```powershell
streamlit run app.py
```

## Run the benchmark

```powershell
py -m simulation.run_benchmark
```

The original `core/__init_.py` filename was a typo. Python package initializers must be named `__init__.py`; the correctly named file is included here.
