import { scanCandidates } from "../scanner.js";
import type { ScanResult, SymbolSnapshot } from "../scanner.js";
import type { Bar, TrendConfig, TrendState } from "../types.js";

export interface WatchOhlcvSeries {
  symbol: string;
  /** K-line open timestamps in milliseconds, ascending. */
  barMs: number[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  vols: number[];
}

export interface AnomalyCandidate {
  series: WatchOhlcvSeries;
  anomalyFlag?: boolean;
}

/**
 * Convert aligned watch-monitor arrays into closed OHLCV bars.
 *
 * The existing monitor's fetch layer currently retains close/volume/time only.
 * For breakout/range features to be trustworthy, the caller must also preserve
 * open/high/low from the original K-line response; do not synthesize them from
 * close prices. barMs is the candle open time, so Bar.time is set to its close
 * boundary and the still-forming candle is excluded.
 */
export function toClosedBars(
  series: WatchOhlcvSeries,
  intervalMs = 60_000,
  nowMs = Date.now()
): Bar[] {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("intervalMs must be a positive finite number");
  }

  const lengths = [
    series.barMs.length,
    series.opens.length,
    series.highs.length,
    series.lows.length,
    series.closes.length,
    series.vols.length
  ];
  if (!lengths.every((length) => length === lengths[0])) {
    throw new Error("OHLCV arrays must have equal lengths");
  }

  const bars: Bar[] = [];
  for (let i = 0; i < series.barMs.length; i++) {
    const openTime = series.barMs[i]!;
    const closeTime = openTime + intervalMs;
    if (closeTime > nowMs) continue;

    const bar: Bar = {
      time: closeTime,
      open: series.opens[i]!,
      high: series.highs[i]!,
      low: series.lows[i]!,
      close: series.closes[i]!,
      volume: series.vols[i]!
    };
    if (![bar.time, bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite)) continue;
    if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0 || bar.volume < 0) continue;
    if (bar.high < Math.max(bar.open, bar.close, bar.low)) continue;
    if (bar.low > Math.min(bar.open, bar.close)) continue;
    bars.push(bar);
  }

  return bars.sort((a, b) => a.time - b.time);
}

/** Adapter entry point: score only symbols already flagged by the anomaly monitor. */
export function scanAnomalyCandidates(
  candidates: AnomalyCandidate[],
  previousStates: Map<string, TrendState> = new Map(),
  nowMs = Date.now(),
  config: Partial<TrendConfig> = {},
  intervalMs = 60_000
): ScanResult {
  const snapshots: SymbolSnapshot[] = candidates.map(({ series, anomalyFlag }) => ({
    symbol: series.symbol,
    bars: toClosedBars(series, intervalMs, nowMs),
    anomalyFlag: anomalyFlag ?? true
  }));
  return scanCandidates(snapshots, previousStates, { now: nowMs }, config);
}
