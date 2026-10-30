"""Metrics collected from benchmark episodes."""


def summarize(records: list[dict]) -> dict[str, float]:
    if not records:
        return {"steps": 0, "mean_latency": 0.0, "sla_violations": 0, "security_breaches": 0}
    return {
        "steps": len(records),
        "mean_latency": sum(item["latency"] for item in records) / len(records),
        "sla_violations": sum(item["latency"] > 100 for item in records),
        "security_breaches": sum(item["security_breach"] for item in records),
    }
