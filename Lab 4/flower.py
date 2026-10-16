"""Flower output for Feast Automata (servo drives the flower directly).

    import flower
    flower.correct()   # right utensil -> elegant twirl + minuet
    flower.wrong()     # wrong utensil -> head shake + sad trombone

Run `python flower.py` to test with the keyboard.
Set FLOWER_FAKE=1 to print actions instead of moving the servo.
"""
import math
import os
import subprocess
import time

SERVO_CH = 0
FACE = 90           # servo angle where the flower faces the user
TWIRL_LEFT = 10     # how far the twirl turns each way; keep inside the servo's range
TWIRL_RIGHT = 170
TWIRL_SPEED = 140   # degrees per second during the twirl
TWIRLS = 3          # left-right twirls per correct pick
SHAKE_DEG = 20      # head-shake size to each side
SHAKES = 3

SOUND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sounds")
CORRECT_SOUND = "correct.wav"
WRONG_SOUND = "wrong.wav"
AUDIO_DEVICE = "plughw:UACDemoV10,0"  # USB speaker (by name, so the card number can change)

FAKE = os.environ.get("FLOWER_FAKE") == "1"

if not FAKE:
    import pi_servo_hat
    # 0.5–2.5 ms covers the MS18's full ~180°; narrow to 0.6/2.4 if it buzzes at the ends
    _servo = pi_servo_hat.PiServoHat(min_pt=0.5, max_pt=2.5)
    _servo.restart()

_angle = FACE
_player = None


def play(name):
    """Start a sound in the background so the flower moves while it plays."""
    global _player
    if _player and _player.poll() is None:
        _player.terminate()          # a new reaction cuts off the old sound
    path = os.path.join(SOUND_DIR, name)
    if FAKE or not os.path.exists(path):
        print(f"[flower] (sound) {name}")
        return
    if path.endswith(".mp3"):
        cmd = ["mpg123", "-q", path]
    else:
        cmd = ["aplay", "-q", path]
        if AUDIO_DEVICE:
            cmd[1:1] = ["-D", AUDIO_DEVICE]
    _player = subprocess.Popen(cmd)


def _write(angle):
    if not FAKE:
        _servo.move_servo_position(SERVO_CH, angle, 180)  # 180 = angles are real degrees


def move_to(target, duration):
    """Ease to target servo angle: slow start, slow stop."""
    global _angle
    start = _angle
    steps = max(1, int(duration / 0.02))
    for i in range(1, steps + 1):
        t = (1 - math.cos(math.pi * i / steps)) / 2
        _angle = start + (target - start) * t
        _write(_angle)
        time.sleep(0.02)


def _sweep(target):
    move_to(target, abs(target - _angle) / TWIRL_SPEED)


def home():
    move_to(FACE, 0.6)


def correct():
    print("[flower] correct -> twirl")
    play(CORRECT_SOUND)
    home()
    for _ in range(TWIRLS):
        _sweep(TWIRL_RIGHT)
        _sweep(TWIRL_LEFT)
    _sweep(FACE)


def wrong():
    print("[flower] wrong -> shake")
    play(WRONG_SOUND)
    home()
    for _ in range(SHAKES):
        move_to(FACE - SHAKE_DEG, 0.15)
        move_to(FACE + SHAKE_DEG, 0.15)
    move_to(FACE, 0.15)


_write(_angle)

if __name__ == "__main__":
    print("1 = correct (twirl)  2 = wrong (shake)  0 = home  <number> = servo angle  q = quit")
    try:
        while (cmd := input("> ").strip()) != "q":
            if cmd == "1":
                correct()
            elif cmd == "2":
                wrong()
            elif cmd == "0":
                home()
            else:
                try:
                    move_to(float(cmd), 0.5)
                    print(f"servo at {_angle:.0f}")
                except ValueError:
                    pass
    except KeyboardInterrupt:
        pass
    if _player:
        _player.terminate()
    home()