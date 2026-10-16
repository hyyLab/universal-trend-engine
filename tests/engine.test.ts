import { describe, expect, it } from "vitest";
import { assessTrend } from "../src/engine.js";
import type { Bar } from "../src/types.js";

function risingBars(count = 20): Bar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = 100 * Math.pow(1.004, index);
    return {
      time: 1_800_000_000_000 + index * 60_000,
      open: index === 0 ? close : 100 * Math.pow(1.004, index - 1),
      high: close * 1.002,
      low: close * 0.998,
      close,
      volume: index >= count - 3 ? 2_500 : 1_000
    };
  });
}

describe("assessTrend", () => {
  it("identifies a directional move and exposes its evidence", () => {
    const bars = risingBars();
    const result = assessTrend(bars, { now: bars.at(-1)!.time + 30_000 });

    expect(result.eligible).toBe(true);
    expect(result.direction).toBe("up");
    expect(result.score).toBeGreaterThan(50);
    expect(result.features?.volumeRatio).toBeGreaterThan(1);
    expect(result.features?.breakout).toBe("up");
  });

  it("rejects stale data", () => {
    const bars = risingBars();
    const result = assessTrend(bars, { now: bars.at(-1)!.time + 10 * 60_000 });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("latest bar is stale");
  });

  it("rejects bars that are not strictly time ordered", () => {
    const bars = risingBars();
    bars[4] = { ...bars[4]!, time: bars[3]!.time };
    const result = assessTrend(bars, { now: bars.at(-1)!.time + 30_000 });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("strictly increasing");
  });
});
