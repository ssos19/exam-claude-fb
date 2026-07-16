// records: [{ position: 0-100, recordedAt: Date }]
// config: { boundary: number } - position >= boundary => 'right'
export function calculateOccupancy(records, config) {
  if (records.length < 2) {
    return { status: 'insufficient_data', sampleCount: records.length };
  }

  const sorted = [...records].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime()
  );

  let leftDurationMs = 0;
  let rightDurationMs = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const segmentMs = next.recordedAt.getTime() - current.recordedAt.getTime();
    if (current.position >= config.boundary) {
      rightDurationMs += segmentMs;
    } else {
      leftDurationMs += segmentMs;
    }
  }

  const totalDurationMs = leftDurationMs + rightDurationMs;
  if (totalDurationMs === 0) {
    return { status: 'insufficient_data', sampleCount: sorted.length };
  }

  return {
    status: 'ok',
    sampleCount: sorted.length,
    totalDurationMs,
    leftDurationMs,
    rightDurationMs,
    leftRatio: leftDurationMs / totalDurationMs,
    rightRatio: rightDurationMs / totalDurationMs,
  };
}
