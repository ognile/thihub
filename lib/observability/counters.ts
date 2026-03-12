type CounterMetadata = Record<string, unknown>;

export function recordCounter(event: string, metadata: CounterMetadata = {}): void {
  const payload = {
    kind: "counter",
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.info(`[observability] ${JSON.stringify(payload)}`);
}
