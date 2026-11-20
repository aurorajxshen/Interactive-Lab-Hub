#!/usr/bin/env python3
"""
Dancing Garden - Musician server

Runs on the Pi that has the Qwiic Joystick (0x20) and the APDS-9960 (0x39).
  - reads both sensors and pushes events to the browser (Socket.IO)
  - serves the Tone.js synth page (open it on any device that has speakers)
  - bridges MQTT: publishes music/* topics, forwards dancer/* and garden/* to the page

Usage:
    python musician_server.py                 # sensors + MQTT
    python musician_server.py --no-hardware   # page only (keyboard / sliders)
    python musician_server.py --team myteam   # topic prefix IDD/myteam/...
"""

import argparse
import json
import threading
import time
from pathlib import Path

import paho.mqtt.client as mqtt
from flask import Flask, send_from_directory
from flask_socketio import SocketIO

MQTT_BROKER = 'farlab.infosci.cornell.edu'
MQTT_PORT = 1883
MQTT_USERNAME = 'idd'
MQTT_PASSWORD = 'device@theFarm'

JOY_ADDR = 0x20
JOY_CENTER = 508
JOY_DEADZONE = 0.12

# adafruit_apds9960 gesture codes -> names (rotate here if the sensor is mounted sideways)
GESTURE_NAMES = {1: 'up', 2: 'down', 3: 'left', 4: 'right'}

STATIC_DIR = Path(__file__).parent / 'static'

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')
status = {'joystick': False, 'apds': False, 'mqtt': False}


@app.route('/')
def index():
    return send_from_directory(STATIC_DIR, 'index.html')


# ---------------------------------------------------------------- MQTT

class Bridge:
    def __init__(self, team, enabled):
        self.prefix = f'IDD/{team}'
        self.enabled = enabled
        self.client = None

    def start(self):
        if not self.enabled:
            return
        self.client = mqtt.Client()
        self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        self.client.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=30)
        self.client.loop_start()

    def _on_connect(self, client, userdata, flags, rc):
        status['mqtt'] = rc == 0
        print(f'[MQTT] connected rc={rc}, prefix={self.prefix}')
        client.subscribe(f'{self.prefix}/dancer/energy')
        client.subscribe(f'{self.prefix}/garden/weather')
        socketio.emit('status', status)

    def _on_disconnect(self, client, userdata, rc):
        status['mqtt'] = False
        socketio.emit('status', status)

    def _on_message(self, client, userdata, msg):
        text = msg.payload.decode(errors='ignore').strip()
        topic = msg.topic[len(self.prefix) + 1:]
        try:
            if topic == 'dancer/energy':
                socketio.emit('dancer', max(0.0, min(1.0, float(text))))
            elif topic == 'garden/weather':
                socketio.emit('weather', text.lower())
        except ValueError:
            print(f'[MQTT] ignored bad payload on {topic}: {text!r}')

    def publish(self, topic, payload):
        if self.client and status['mqtt']:
            self.client.publish(f'{self.prefix}/{topic}', payload)


bridge = None


@socketio.on('beat')
def on_beat(data):
    bridge.publish('music/beat', json.dumps(data))


@socketio.on('state')
def on_state(data):
    bridge.publish('music/bpm', f"{data['bpm']:.1f}")
    bridge.publish('music/energy', str(data['level']))
    bridge.publish('music/instrument', data['instrument'])
    if 'mix' in data:
        bridge.publish('music/mix', f"{data['mix']:.2f}")


@socketio.on('drop')
def on_drop(data):
    bridge.publish('music/drop', json.dumps(data))


# ---------------------------------------------------------------- sensors

def joystick_loop(i2c, invert_x, invert_y, debug):
    from adafruit_bus_device.i2c_device import I2CDevice
    dev = I2CDevice(i2c, JOY_ADDR)
    buf = bytearray(5)

    def norm(raw):
        v = (raw - JOY_CENTER) / 512.0
        if abs(v) < JOY_DEADZONE:
            return 0.0
        v = (abs(v) - JOY_DEADZONE) / (1 - JOY_DEADZONE) * (1 if v > 0 else -1)
        return max(-1.0, min(1.0, v))

    last = None
    was_pressed = False
    reads = errors = 0
    beat = time.time()
    while True:
        if debug and time.time() - beat > 5:
            print(f'[stick] heartbeat: {reads} reads, {errors} errors, last={last}')
            beat = time.time()
        try:
            with dev:
                dev.write_then_readinto(bytes([0x03]), buf)
            reads += 1
        except OSError as e:
            errors += 1
            if errors <= 3:
                print(f'[stick] read error: {e!r}')
            time.sleep(0.2)
            continue
        x = norm(((buf[0] << 8) | buf[1]) >> 6) * (-1 if invert_x else 1)
        y = -norm(((buf[2] << 8) | buf[3]) >> 6) * (-1 if invert_y else 1)
        pressed = buf[4] == 0
        cur = (round(x, 2), round(y, 2))
        if cur != last:
            socketio.emit('stick', {'x': cur[0], 'y': cur[1]})
            last = cur
            if debug:
                print(f'[stick] {cur}')
        if pressed and not was_pressed:
            socketio.emit('click')
            if debug:
                print('[stick] click')
        was_pressed = pressed
        time.sleep(0.02)


def apds_loops(i2c, hover_level, hover_hold, debug):
    import adafruit_apds9960.apds9960 as apds_mod
    sensor = apds_mod.APDS9960(i2c)
    sensor.enable_proximity = True
    sensor.enable_gesture = True
    state = {'gesture_at': 0.0}

    def gesture_loop():
        while True:
            try:
                code = sensor.gesture()   # blocks while a hand lingers over the sensor
            except (OSError, IndexError):   # driver edge case on a garbled FIFO read; just retry
                time.sleep(0.1)
                continue
            time.sleep(0.01)   # let the other I2C threads in; a tight loop starved the joystick of the bus lock
            if code in GESTURE_NAMES:
                state['gesture_at'] = time.time()
                socketio.emit('gesture', GESTURE_NAMES[code])
                if debug:
                    print(f'[gesture] {GESTURE_NAMES[code]}')

    def hover_loop():
        near_since = None
        fired = False
        while True:
            try:
                prox = sensor.proximity
            except OSError:
                time.sleep(0.2)
                continue
            if prox >= hover_level:
                near_since = near_since or time.time()
                held = time.time() - near_since
                if held >= hover_hold and not fired and state['gesture_at'] < near_since:
                    fired = True
                    socketio.emit('hover', prox)
                    if debug:
                        print(f'[hover] prox={prox}')
            else:
                near_since, fired = None, False
            time.sleep(0.05)

    threading.Thread(target=gesture_loop, daemon=True).start()
    threading.Thread(target=hover_loop, daemon=True).start()


def start_hardware(args):
    try:
        import board
        import busio
        i2c = busio.I2C(board.SCL, board.SDA)
    except Exception as e:
        print(f'[HW] I2C unavailable: {e}')
        return
    try:
        # own bus object: busio locks per instance, and the kernel serialises the real transfers
        joy_i2c = busio.I2C(board.SCL, board.SDA)
        threading.Thread(target=joystick_loop,
                         args=(joy_i2c, args.invert_x, args.invert_y, args.debug_sensors),
                         daemon=True).start()
        status['joystick'] = True
        print('[HW] Qwiic Joystick started')
    except Exception as e:
        print(f'[HW] joystick failed: {e}')
    try:
        apds_loops(i2c, args.hover_level, args.hover_hold, args.debug_sensors)
        status['apds'] = True
        print('[HW] APDS-9960 gesture + proximity started')
    except Exception as e:
        print(f'[HW] APDS-9960 failed: {e}')


@socketio.on('connect')
def on_connect():
    socketio.emit('status', status)


def main():
    global bridge
    p = argparse.ArgumentParser()
    p.add_argument('--team', default='dancinggarden', help='MQTT topic prefix IDD/<team>/')
    p.add_argument('--port', type=int, default=5100)
    p.add_argument('--no-hardware', action='store_true')
    p.add_argument('--no-mqtt', action='store_true')
    p.add_argument('--invert-x', action='store_true')
    p.add_argument('--invert-y', action='store_true')
    p.add_argument('--hover-level', type=int, default=120, help='APDS proximity (0-255) that counts as "near"')
    p.add_argument('--hover-hold', type=float, default=0.6, help='seconds a hand must stay near to trigger a sparkle')
    p.add_argument('--debug-sensors', action='store_true')
    args = p.parse_args()

    bridge = Bridge(args.team, not args.no_mqtt)
    bridge.start()
    if not args.no_hardware:
        start_hardware(args)
    print(f'Musician page: http://0.0.0.0:{args.port}   (open it on a device with speakers)')
    socketio.run(app, host='0.0.0.0', port=args.port, allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    main()