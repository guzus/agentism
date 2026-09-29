export interface GatewayHealth {
  healthy: boolean;
  reachable: boolean;
  check: "http-reachability";
  modelReadiness: "unknown";
  gatewayStatus?: number;
  reason?: string;
  lastChecked: string;
}

// Share both pending requests and results. Public health checks must never
// enqueue a command, call a model, or forward gateway credentials to redirects.
export function createGatewayHealthChecker(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, { expires: number; result: Promise<GatewayHealth> }>();
  return async function checkGateway(url: string): Promise<GatewayHealth> {
    const cached = cache.get(url);
    if (cached && cached.expires > now()) return cached.result;
    for (const [key, entry] of cache) if (entry.expires <= now()) cache.delete(key);
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    const result = (async (): Promise<GatewayHealth> => {
      const common = {
        check: "http-reachability" as const, modelReadiness: "unknown" as const,
        lastChecked: new Date(now()).toISOString(),
      };
      try {
        const response = await fetcher(url, {
          method: "HEAD", redirect: "error", signal: AbortSignal.timeout(5_000),
        });
        // 401/403/405 still demonstrate a reachable HTTP server, but they do
        // not demonstrate that the gateway or its model is ready for work.
        return {
          ...common, reachable: true, healthy: response.ok, gatewayStatus: response.status,
          reason: "HTTP reachability only; model readiness was not checked.",
        };
      } catch {
        return { ...common, reachable: false, healthy: false, reason: "Gateway unreachable." };
      }
    })();
    cache.set(url, { result, expires: now() + 30_000 });
    return result;
  };
}

export const checkGatewayHealth = createGatewayHealthChecker();
