# Sensor bridge — Raspberry Pi → website

`sensor_bridge.py` runs the teammate's `motion_live.py` (one process, owns the I²C bus),
reads its stdout (one `kitchen-motion.v1` JSON object per line) and streams it to the
browser as Server-Sent Events. Python standard library only — nothing to install.

```
motion_live.py ──stdout JSON lines──▶ sensor_bridge.py ──SSE :8765/events──▶ website (?sensors=…)
       stderr (diagnostics) ──▶ bridge stderr (never mixed into the data)
```

## On the Pi

```bash
python3 sensor_bridge.py --motion-dir "/home/pi/Interactive-Lab-Hub/Final Project"
```

- Uses `<motion-dir>/.venv/bin/python` if it exists (override with `--python`).
- `--step auto` by default, as recommended in INTEGRATION.md.
- Restarts `motion_live.py` 3 s after it exits, with a new session id.
- Ctrl+C sends SIGINT to `motion_live.py` so it emits `stopped` and releases I²C.
- Do not run `motion_capture.py` or another `motion_live.py` at the same time.

Check it from the laptop: `http://raspberrypi.local:8765/health`.

## On the laptop

Open the website with `?sensors=http://raspberrypi.local:8765`
(or Help → Wearable sensors → address + “Connect to sensors”). Use the Pi's IP
if `.local` names don't resolve on your network.

## Without hardware

```bash
python3 bridge/sensor_bridge.py --replay bridge/fixtures/mixed_session_20261121.jsonl
python3 bridge/sensor_bridge.py --replay bridge/fixtures/head_session.jsonl --fast --loop
```

## Stream format

| SSE event | data |
|---|---|
| `hello` (on every connect) | `{sessionId, lastSeq, bridgeNow, processRunning, source, ready, latestState}` — no backlog of gestures |
| `motion` | `{sessionId, receivedAt, event}` — `event` is the unmodified motion_live.py JSON |
| `bridge` | `{status: started \| restarting \| exited \| replay-finished, sessionId, code, bridgeNow}` |

The website validates every message (`src/sensors/protocol.ts`) and maps it in
`src/sensors/sensorAdapter.ts`: head `confirm` → confirm only, `next` → look ahead,
`undo` → undo; hand data → motion feedback only, filtered by the current step.
