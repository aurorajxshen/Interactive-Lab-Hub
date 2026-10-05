import time
import math
import subprocess
from pathlib import Path

import board
from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC


# ============================================================
# EchoShell - MVP
# ============================================================

BASE_DIR = Path(__file__).parent
OCEAN_FILE = BASE_DIR / "sounds" / "ocean.wav"
RECORDINGS_DIR = BASE_DIR / "recordings"

RECORDINGS_DIR.mkdir(exist_ok=True)

# ---------- Hardware ----------
i2c = board.I2C()
imu = LSM6DS3TRC(i2c)

SPEAKER_DEVICE = "plughw:2,0"
MIC_DEVICE = "plughw:3,0"

# ---------- Interaction parameters ----------
MOVEMENT_THRESHOLD = 0.30

# User must move the shell above threshold to wake it.
WAKE_CONFIRM_TIME = 0.25

# For the first MVP we record a fixed duration.
# We will replace this with 3-second silence detection next.
RECORD_SECONDS = 8

# After memory playback, wait before sleeping.
REFLECTION_WINDOW = 10


# ============================================================
# Audio
# ============================================================

ocean_process = None


def start_ocean():
    """Start looping ocean ambience."""
    global ocean_process

    if ocean_process is not None:
        return

    print("[OCEAN] Ocean begins.")

    ocean_process = subprocess.Popen(
        [
            "aplay",
            "-D", SPEAKER_DEVICE,
            "--quiet",
            str(OCEAN_FILE)
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def stop_ocean():
    """Stop ocean ambience."""
    global ocean_process

    if ocean_process is not None:
        ocean_process.terminate()

        try:
            ocean_process.wait(timeout=1)
        except subprocess.TimeoutExpired:
            ocean_process.kill()

        ocean_process = None

    print("[OCEAN] Ocean fades.")


def play_audio(path):
    """Play a WAV file through EchoShell's speaker."""

    subprocess.run(
        [
            "aplay",
            "-D", SPEAKER_DEVICE,
            "--quiet",
            str(path)
        ]
    )


# ============================================================
# Sensors
# ============================================================

def movement_level():
    """Return magnitude of gyroscope movement."""

    gx, gy, gz = imu.gyro

    return math.sqrt(
        gx ** 2 +
        gy ** 2 +
        gz ** 2
    )


def wait_for_pickup():
    """Wait until the shell is moved."""

    print("\n[SHELL] EchoShell is sleeping.")
    print("Pick up the shell to wake it.")

    moving_since = None

    while True:

        movement = movement_level()

        if movement > MOVEMENT_THRESHOLD:

            if moving_since is None:
                moving_since = time.time()

            elif time.time() - moving_since >= WAKE_CONFIRM_TIME:
                print("[WAKE] Shell picked up.")
                return

        else:
            moving_since = None

        time.sleep(0.05)


# ============================================================
# Recording
# ============================================================

def record_user():

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    output = RECORDINGS_DIR / f"memory_{timestamp}.wav"

    print()
    print("[MIC] EchoShell is listening...")
    print(f"Speak for up to {RECORD_SECONDS} seconds.")

    subprocess.run(
        [
            "arecord",
            "-D", MIC_DEVICE,
            "-f", "S16_LE",
            "-r", "16000",
            "-c", "1",
            "-d", str(RECORD_SECONDS),
            "--quiet",
            str(output)
        ]
    )

    print("[SAVE] Memory stored.")

    return output


# ============================================================
# EchoShell interaction
# ============================================================

def interaction():

    wait_for_pickup()

    # Wake
    start_ocean()

    time.sleep(1)

    # Listen
    new_memory = record_user()

    print()
    print("[OCEAN] EchoShell holds the memory.")

    time.sleep(2)

    # For this first MVP we simply play the memory back.
    # Later the Wizard will select a PREVIOUS memory instead.
    stop_ocean()

    print()
    print("[SHELL] I remember an echo like this...")
    time.sleep(1.5)

    print("[PLAY] Playing memory.")
    play_audio(new_memory)

    # Reflection
    start_ocean()

    print()
    print(
        f"[WAIT] EchoShell waits quietly for "
        f"{REFLECTION_WINDOW} seconds."
    )

    time.sleep(REFLECTION_WINDOW)

    stop_ocean()

    print("[SLEEP] EchoShell returns to sleep.")


# ============================================================
# Main loop
# ============================================================

try:

    print("=" * 45)
    print("        EchoShell - A Shell That Remembers")
    print("=" * 45)

    while True:
        interaction()

except KeyboardInterrupt:

    stop_ocean()

    print()
    print("EchoShell stopped.")
