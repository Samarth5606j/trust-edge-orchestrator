import numpy as np

class BaselineAllocators:
    @staticmethod
    def greedy_latency(env):
        """Picks the server offering the lowest base network latency."""
        return int(np.argmin([p["base_latency"] for p in env.node_profiles]))

    @staticmethod
    def round_robin(step_counter, num_nodes):
        """Standard cyclic round-robin load distribution."""
        return step_counter % num_nodes

    @staticmethod
    def static_threshold(env, threshold=0.6):
        """
        Filters out servers with trust below the cutoff threshold, 
        then picks the fastest among the remaining trusted nodes.
        """
        trust_scores = env.trust_engine.get_trust_scores()
        trusted_indices = [i for i, t in enumerate(trust_scores) if t >= threshold]
        
        if not trusted_indices:
            # Fallback to absolute highest trust node if all are below cutoff
            return int(np.argmax(trust_scores))
            
        latencies = [env.node_profiles[i]["base_latency"] for i in trusted_indices]
        return trusted_indices[int(np.argmin(latencies))]