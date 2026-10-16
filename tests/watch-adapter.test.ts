import { describe, expect, it } from "vitest";
import { toClosedBars } from "../src/adapters/watch-monitor.js";
import type { WatchOhlcvSeries } from "../src/adapters/watch-monitor.js";

function series(): WatchOhlcvSeries {
  return {
    symbol: "TEST",
    barMs: [60_000, 120_000, 180_000],
    opens: [10, 10.1, 10.2],
    highs: [10.2, 10.3, 10.4],
    lows: [9.9, 10, 10.1],
    closes: [10.1, 10.2, 10.3],
    vols: [100, 120, 300]
  };
}

describe("watch monitor adapter", () => {
  it("excludes the still-forming candle and converts open time to close time", () => {
    const bars = toClosedBars(series(), 60_000, 240_000);
    expect(bars).toHaveLength(3);
    expect(bars[0]!.time).toBe(120_000);

    const beforeLastClose = toClosedBars(series(), 60_000, 239_999);
    expect(beforeLastClose).toHaveLength(2);
  });

  it("rejects misaligned OHLCV arrays rather than silently pairing wrong values", () => {
    const input = series();
    input.vols.pop();
    expect(() => toClosedBars(input, 60_000, 240_000)).toThrow("equal lengths");
  });
});
