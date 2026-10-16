import { describe, expect, it } from "vitest";
import { createTrendState, updateTrendState } from "../src/state-machine.js";
import type { TrendAssessment } from "../src/types.js";

function upAssessment(barTime: number): TrendAssessment {
  return {
    direction: "up",
    score: 82,
    eligible: true,
    reason: "test",
    features: {
      returnPct: 1.2,
      directionalConsistency: 0.8,
      volumeRatio: 2,
      breakout: "up",
      rangeExpansion: 1.4,
      anomalyFlag: true,
      barsUsed: 20,
      latestBarTime: barTime
    }
  };
}

describe("trend state machine", () => {
  it("does not count repeated scans of the same bar as separate confirmations", () => {
    let state = createTrendState("TEST");
    state = updateTrendState(state, upAssessment(1000), 1000, 3);
    expect(state.phase).toBe("candidate");
    expect(state.consecutiveObservations).toBe(1);

    state = updateTrendState(state, upAssessment(1000), 2000, 3);
    expect(state.phase).toBe("candidate");
    expect(state.consecutiveObservations).toBe(1);

    state = updateTrendState(state, upAssessment(2000), 3000, 3);
    expect(state.phase).toBe("candidate");
    expect(state.consecutiveObservations).toBe(2);

    state = updateTrendState(state, upAssessment(3000), 4000, 3);
    expect(state.phase).toBe("confirmed");
    expect(state.direction).toBe("up");
  });

  it("starts a new candidate when the confirmed direction reverses", () => {
    let state = createTrendState("TEST");
    state = updateTrendState(state, upAssessment(1000), 1000, 1);
    expect(state.phase).toBe("confirmed");

    const down: TrendAssessment = {
      ...upAssessment(2000),
      direction: "down",
      features: { ...upAssessment(2000).features!, returnPct: -1, breakout: "down" }
    };
    state = updateTrendState(state, down, 2000, 3);
    expect(state.phase).toBe("candidate");
    expect(state.candidateDirection).toBe("down");
    expect(state.direction).toBe("flat");
  });
});
