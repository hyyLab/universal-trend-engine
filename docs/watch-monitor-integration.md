# Integrating with the anomaly monitor

## Current upstream shape

The current monitor's detector emits per-symbol anomaly hits with a window, signed return, hit level, and volume ratio. Its fetch layer currently exposes:

- symbol
- close-price array
- volume array
- K-line open-time array

The underlying exchange K-line response contains OHLCV, but the current fetch layer discards open/high/low. The new engine uses range-breakout evidence, so those values must be retained rather than fabricated from closes.

## Recommended integration sequence

1. Keep the current anomaly detector and alert behavior unchanged.
2. Extend the fetch result to preserve aligned open/high/low/close/volume arrays from each K-line row.
3. Pass only symbols with an anomaly hit into `scanAnomalyCandidates`; do not scan the full universe unless there is a separate reason to.
4. The adapter filters out the unfinished 1-minute candle and uses the candle close boundary as its timestamp.
5. Persist the returned per-symbol state between scans. If state is not persisted, candidate confirmation restarts after process reloads.
6. Initially render trend state beside the existing anomaly event; do not replace or suppress existing alerts.
7. Replay historical data and compare false positives, missed trends, and confirmation delay before enabling notifications.

## Signal interpretation

- `candidate`: directional evidence exists but has not persisted for enough distinct closed bars.
- `confirmed`: the configured confirmation count has been reached on distinct closed bars.
- `idle`: no usable directional trend is currently established.
- `score`: explainable 0–100 heuristic, not a calibrated probability.

The MVP confirmation count is bar-based. It is not yet identical to the existing pair engine's elapsed-time plus long-window-evidence rules. Porting the existing FAST/PRIMARY/structure layers and their event-driven state transitions is the next compatibility step; do not treat this MVP as a drop-in replacement for the current SOXL/KORU engine.

## Data contract example

The adapter expects the following aligned arrays for each candidate:

- `barMs`: candle open timestamp in milliseconds
- `opens`, `highs`, `lows`, `closes`, `vols`: numeric arrays of equal length

Do not estimate high/low from close. Missing or misaligned OHLCV should be fixed in the upstream adapter.
