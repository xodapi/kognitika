type SseConnectionLimits = {
  global: number;
  perAddress: number;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveSseConnectionLimits(env: NodeJS.ProcessEnv = process.env): SseConnectionLimits {
  return {
    global: positiveInteger(env.SSE_MAX_CONNECTIONS, 200),
    perAddress: positiveInteger(env.SSE_MAX_CONNECTIONS_PER_ADDRESS, 5),
  };
}

export function createSseConnectionManager(limits: SseConnectionLimits) {
  let total = 0;
  const byAddress = new Map<string, number>();

  return {
    acquire(address: string) {
      const addressCount = byAddress.get(address) || 0;
      if (total >= limits.global || addressCount >= limits.perAddress) return null;

      total += 1;
      byAddress.set(address, addressCount + 1);
      let released = false;

      return () => {
        if (released) return;
        released = true;
        total -= 1;
        const next = (byAddress.get(address) || 1) - 1;
        if (next === 0) byAddress.delete(address);
        else byAddress.set(address, next);
      };
    },
    counts() {
      return { total, addresses: new Map(byAddress) };
    },
  };
}
