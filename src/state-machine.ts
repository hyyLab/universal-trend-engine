import type { TrendAssessment, TrendDirection, TrendSignal, TrendState } from "./types.js";

export function createTrendState(symbol: string): TrendState {
  return {
    symbol,
    phase: "idle",
    direction: "flat",
    candidateDirection: "flat",
    consecutiveObservations: 0,
    changedAt: null,
    lastUpdatedAt: null,
    lastScore: 0
  };
}

export function updateTrendState(
  previous: TrendState,
  assessment: TrendAssessment,
  now: number = Date.now(),
  confirmObservations = 3
): TrendSignal {
  if (!Number.isInteger(confirmObservations) || confirmObservations < 1) {
    throw new Error("confirmObservations must be a positive integer");
  }

  let next: TrendState = { ...previous, lastUpdatedAt: now, lastScore: assessment.score };
  if (!assessment.eligible || assessment.direction === "flat") {
    next = {
      ...next,
      phase: "idle",
      direction: "flat",
      candidateDirection: "flat",
      consecutiveObservations: 0,
      changedAt: previous.phase === "idle" ? previous.changedAt : now
    };
    return { ...next, assessment };
  }

  const direction: TrendDirection = assessment.direction;
  const sameCandidate = previous.phase === "candidate" && previous.candidateDirection === direction;
  const alreadyConfirmed = previous.phase === "confirmed" && previous.direction === direction;

  if (alreadyConfirmed) {
    next = { ...next, direction, candidateDirection: direction, consecutiveObservations: confirmObservations };
  } else {
    const count = sameCandidate ? previous.consecutiveObservations + 1 : 1;
    if (count >= confirmObservations) {
      next = {
        ...next,
        phase: "confirmed",
        direction,
        candidateDirection: direction,
        consecutiveObservations: count,
        changedAt: previous.direction === direction && previous.phase === "confirmed" ? previous.changedAt : now
      };
    } else {
      next = {
        ...next,
        phase: "candidate",
        direction: "flat",
        candidateDirection: direction,
        consecutiveObservations: count,
        changedAt: previous.phase === "candidate" && previous.candidateDirection === direction ? previous.changedAt : now
      };
    }
  }

  return { ...next, assessment };
}
