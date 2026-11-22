#!/usr/bin/env python3
"""
sensor_bridge.py - Raspberry Pi motion_live.py -> browser, via Server-Sent Events.

Standard library only (no pip install). Runs ONE motion_live.py process no
matter how many browsers connect (only one process may own the I2C bus), reads
its stdout line by line (each line is one kitchen-motion.v1 JSON object), and
forwards every valid message to all connected pages as

    event: motion
    data: {"sessionId": "...", "receivedAt": <ms>, "event": {...the original JSON...}}

stderr from motion_live.py (hardware diagnostics) is passed through to this
process's stderr and is never mixed into the data stream.

On each browser (re)connection the bridge first sends

    event: hello
    data: {"sessionId", "lastSeq", "bridgeNow", "processRunning", "source", "ready", "latestState"}

and NO backlog of head/hand events, so stale gestures can never replay.
When motion_live.py exits, an `event: bridge` status is sent and the process is
restarted after --restart-delay seconds with a new sessionId (seq restarts at 1).

Usage on the Pi (from anywhere):
    python3 sensor_bridge.py --motion-dir "/home/pi/Interactive-Lab-Hub/Final Project"
Without hardware (replays a recorded JSONL log with its original timing):
    python3 sensor_bridge.py --replay fixtures/mixed_session_20261121.jsonl --loop
Then open the website with  ?sensors=http://<pi-host>:8765
"""
import argparse
import json
import os
import queue
import signal
import subprocess
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCHEMA = "kitchen-motion.v1"


def log(*parts):
    print("[bridge]", *parts, file=sys.stderr, flush=True)


def now_ms():
    return int(time.time() * 1000)


class Hub:
    """Latest state + connected clients. Thread-safe."""

    def __init__(self, source):
        self.lock = threading.Lock()
        self.clients = set()
        self.source = source
        self.session_id = None
        self.last_seq = 0
        self.ready = None
        self.latest_state = None
        self.running = False
        self.invalid_lines = 0

    def new_session(self):
        with self.lock:
            self.session_id = str(uuid.uuid4())
            self.last_seq = 0
            self.ready = None
            self.latest_state = None
            self.running = True
            sid = self.session_id
        self.broadcast("bridge", {"status": "started", "sessionId": sid, "bridgeNow": now_ms()})
        return sid

    def ended(self, status, code=None):
        with self.lock:
            self.running = False
            sid = self.session_id
        self.broadcast("bridge", {"status": status, "sessionId": sid, "code": code, "bridgeNow": now_ms()})

    def hello(self):
        with self.lock:
            return {
                "sessionId": self.session_id,
                "lastSeq": self.last_seq,
                "bridgeNow": now_ms(),
                "processRunning": self.running,
                "source": self.source,
                "ready": self.ready,
                "latestState": self.latest_state,
            }

    def add(self, q):
        with self.lock:
            self.clients.add(q)

    def remove(self, q):
        with self.lock:
            self.clients.discard(q)

    def broadcast(self, event, data):
        payload = f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n".encode()
        with self.lock:
            clients = list(self.clients)
        for q in clients:
            try:
                q.put_nowait(payload)
            except queue.Full:
                # a stalled client must not hold back the others; it will reconnect and get a fresh hello
                self.remove(q)

    def line(self, raw):
        """Handle one stdout line from motion_live.py (or a replay file)."""
        raw = raw.strip()
        if not raw:
            return
        try:
            event = json.loads(raw)
        except json.JSONDecodeError as exc:
            self.invalid_lines += 1
            log("invalid JSON line ignored:", exc.msg, raw[:120])
            return
        if not isinstance(event, dict) or event.get("schema") != SCHEMA or not isinstance(event.get("seq"), int):
            self.invalid_lines += 1
            log("non kitchen-motion.v1 line ignored:", raw[:120])
            return
        with self.lock:
            sid = self.session_id
            self.last_seq = max(self.last_seq, event["seq"])
            if event.get("type") == "ready":
                self.ready = event
            elif event.get("type") == "state":
                self.latest_state = event
        self.broadcast("motion", {"sessionId": sid, "receivedAt": now_ms(), "event": event})


def run_live(hub, args, stop):
    motion_dir = Path(args.motion_dir).expanduser().resolve()
    script = motion_dir / "motion_live.py"
    if not script.exists():
        log(f"motion_live.py not found in {motion_dir}")
        sys.exit(2)
    python = args.python
    if not python:
        venv = motion_dir / ".venv" / "bin" / "python"
        python = str(venv) if venv.exists() else sys.executable
    while not stop.is_set():
        sid = hub.new_session()
        log(f"starting motion_live.py (session {sid[:8]}) with {python}")
        child = subprocess.Popen(
            [python, "-u", "motion_live.py", "--step", args.step],
            cwd=str(motion_dir),
            stdout=subprocess.PIPE,
            stderr=None,  # diagnostics pass straight through to our stderr
            text=True,
            bufsize=1,
        )
        hub.child = child
        for raw in child.stdout:
            hub.line(raw)
        code = child.wait()
        log(f"motion_live.py exited with code {code}")
        if stop.is_set():
            hub.ended("exited", code)
            break
        hub.ended("restarting", code)
        stop.wait(args.restart_delay)


def run_replay(hub, args, stop):
    path = Path(args.replay)
    lines = [l for l in path.read_text().splitlines() if l.strip()]
    while not stop.is_set():
        hub.new_session()
        log(f"replaying {len(lines)} lines from {path.name}")
        previous = None
        for raw in lines:
            if stop.is_set():
                return
            try:
                t = json.loads(raw).get("t")
            except (json.JSONDecodeError, AttributeError):
                t = None
            if previous is not None and isinstance(t, (int, float)):
                stop.wait(0.05 if args.fast else max(0.0, t - previous))
            if isinstance(t, (int, float)):
                previous = t
            hub.line(raw)
        if not args.loop:
            hub.ended("replay-finished")
            return
        stop.wait(2)


def make_handler(hub, allow_origin):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def log_message(self, fmt, *a):  # keep stderr for real diagnostics
            pass

        def handle(self):
            try:
                super().handle()
            except (ConnectionResetError, BrokenPipeError):
                pass  # browser closed the tab / reconnected; nothing to report

        def cors(self):
            self.send_header("Access-Control-Allow-Origin", allow_origin)
            self.send_header("Cache-Control", "no-cache")

        def do_GET(self):
            if self.path.startswith("/health"):
                body = json.dumps({**hub.hello(), "clients": len(hub.clients), "invalidLines": hub.invalid_lines}).encode()
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if not self.path.startswith("/events"):
                self.send_error(404)
                return
            self.send_response(200)
            self.cors()
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            q = queue.Queue(maxsize=500)
            hub.add(q)
            try:
                hello = json.dumps(hub.hello(), separators=(",", ":"))
                self.wfile.write(f"retry: 1500\nevent: hello\ndata: {hello}\n\n".encode())
                self.wfile.flush()
                while True:
                    try:
                        chunk = q.get(timeout=10)
                    except queue.Empty:
                        chunk = b": keep-alive\n\n"
                    self.wfile.write(chunk)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                hub.remove(q)

    return Handler


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--motion-dir", help="folder containing motion_live.py and motion_capture.py")
    src.add_argument("--replay", help="replay a recorded kitchen-motion.v1 JSONL file instead of hardware")
    p.add_argument("--python", help="python executable for motion_live.py (default: <motion-dir>/.venv/bin/python)")
    p.add_argument("--step", default="auto", choices=["auto", "chop", "stir", "flip", "twist"])
    p.add_argument("--host", default="0.0.0.0")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--allow-origin", default="*", help="CORS origin of the website")
    p.add_argument("--restart-delay", type=float, default=3.0)
    p.add_argument("--fast", action="store_true", help="replay: ignore original timing")
    p.add_argument("--loop", action="store_true", help="replay: start again at the end")
    args = p.parse_args()

    hub = Hub("replay" if args.replay else "live")
    hub.child = None
    stop = threading.Event()
    worker = threading.Thread(target=run_replay if args.replay else run_live, args=(hub, args, stop), daemon=True)

    server = ThreadingHTTPServer((args.host, args.port), make_handler(hub, args.allow_origin))
    server.daemon_threads = True

    def shutdown(*_):
        stop.set()
        child = getattr(hub, "child", None)
        if child and child.poll() is None:
            child.send_signal(signal.SIGINT)  # lets motion_live.py emit "stopped" and release I2C
            try:
                child.wait(timeout=3)
            except subprocess.TimeoutExpired:
                child.kill()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    worker.start()
    log(f"listening on http://{args.host}:{args.port}/events  (health: /health)")
    server.serve_forever()


if __name__ == "__main__":
    main()
