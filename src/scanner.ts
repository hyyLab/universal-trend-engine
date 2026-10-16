import { assessTrend } from "./engine.js";
import { createTrendState, updateTrendState } from "./state-machine.js";
import type { AssessmentOptions, Bar, TrendConfig, TrendSignal, TrendState } from "./types.js";

export interface SymbolSnapshot {
  symbol: string;
  bars: Bar[];
  anomalyFlag?: boolean;
}

export interface ScanResult {
  signals: TrendSignal[];
  states: Map<string, TrendState>;
}

/**
 * Stateless scan helper for an upstream anomaly monitor.
 * Keep the returned states between scans to preserve confirmation history.
 */
export function scanCandidates(
  snapshots: SymbolSnapshot[],
  previousStates: Map<string, TrendState> = new Map(),
  options: Omit<AssessmentOptions, "anomalyFlag"> = {},
  config: Partial<TrendConfig> = {}
): ScanResult {
  const states = new Map(previousStates);
  const signals: TrendSignal[] = [];

  for (const snapshot of snapshots) {
    const assessment = assessTrend(
      snapshot.bars,
      { ...options, anomalyFlag: snapshot.anomalyFlag ?? false },
      config
    );
    const previous = states.get(snapshot.symbol) ?? createTrendState(snapshot.symbol);
    const signal = updateTrendState(
      previous,
      assessment,
      options.now ?? Date.now(),
      config.confirmObservations ?? 3
    );
    states.set(snapshot.symbol, signal);
    signals.push(signal);
  }

  signals.sort((a, b) => {
    const phaseRank = (phase: TrendSignal["phase"]) => phase === "confirmed" ? 2 : phase === "candidate" ? 1 : 0;
    return phaseRank(b.phase) - phaseRank(a.phase) || b.lastScore - a.lastScore;
  });
  return { signals, states };
}
