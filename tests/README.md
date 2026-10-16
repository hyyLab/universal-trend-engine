# Validation plan

Before connecting this engine to live alerts:

1. Unit-test feature calculations with synthetic OHLCV bars.
2. Replay several weeks of intraday bars for liquid and illiquid symbols.
3. Measure false-positive rate, missed trend rate, and confirmation delay.
4. Compare output against the current SOXL/KORU trend engine without replacing it.
5. Tune parameters by bar interval and instrument class; do not assume one threshold fits all assets.
