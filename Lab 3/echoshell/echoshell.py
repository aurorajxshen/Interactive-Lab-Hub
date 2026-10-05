import json
import math
import os
import queue
import random
import subprocess
import threading
import time
import wave
from datetime import datetime
from pathlib import Path

import board
import numpy as np
import sounddevice as sd

from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC
from adafruit_apds9960.apds9960 import APDS9960


# ============================================================
# EchoShell v2
# A Shell That Remembers
# ============================================================

BASE_DIR = Path(__file__).parent

SOUNDS_DIR = BASE_DIR / "sounds"
RECORDINGS_DIR = BASE_DIR / "recordings"
MEMORIES_DIR = BASE_DIR / "memories"

OCEAN_FILE = SOUNDS_DIR / "ocean.wav"
MEMORY_INDEX = MEMORIES_DIR / "memory_index.json"

RECORDINGS_DIR.mkdir(exist_ok=True)
MEMORIES_DIR.mkdir(exist_ok=True)


# ============================================================
# Interaction parameters
# ============================================================

# IMU
MOVEMENT_THRESHOLD = 0.30
WAKE_CONFIRM_TIME = 0.25

# Based on our real APDS9960 measurements:
# far = 0-1
# ~10 cm = 2-3
# face / speaking distance > 10
PROXIMITY_THRESHOLD = 8

# Audio
SAMPLE_RATE = 44100
CHANNELS = 1

# This is intentionally conservative.
# We will calibrate only if real testing shows a problem.
SPEECH_RMS_THRESHOLD = 500

# User turn ends after this much silence.
ENDPOINT_SILENCE = 3.0

# User must actually speak before we consider a turn started.
MIN_SPEECH_TIME = 0.35

# Reflection period after old memory playback.
REFLECTION_WINDOW = 10.0

# Ocean feedback
SWELL_DURATION = 1.5

# Device names discovered earlier.
MIC_HINT = "USB PnP Sound Device"
SPEAKER_DEVICE = "plughw:2,0"


# ============================================================
# Hardware
# ============================================================

i2c = board.I2C()

imu = LSM6DS3TRC(i2c)

proximity_sensor = APDS9960(i2c)
proximity_sensor.enable_proximity = True


# ============================================================
# Runtime state
# ============================================================

running = True
ocean_process = None

audio_queue = queue.Queue()


# ============================================================
# Utility
# ============================================================

def log(message):
    print(message, flush=True)


def now_string():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def timestamp_string():
    return datetime.now().strftime("%Y%m%d_%H%M%S")


# ============================================================
# Ocean
# ============================================================

def start_ocean():
    global ocean_process

    if ocean_process is not None and ocean_process.poll() is None:
        return

    ocean_file = SOUNDS_DIR / "ocean.wav"

    if not ocean_file.exists():
        log("[OCEAN] ocean.wav missing.")
        return

    log("[OCEAN] Background ocean fades in.")

    ocean_process = subprocess.Popen(
        [
            "ffmpeg",
            "-loglevel", "quiet",
            "-stream_loop", "-1",
            "-i", str(ocean_file),
            "-af", "afade=t=in:st=0:d=2,volume=0.32",
            "-f", "wav",
            "-"
        ],
        stdout=subprocess.PIPE
    )

    ocean_process.player = subprocess.Popen(
        ["pw-play", "-"],
        stdin=ocean_process.stdout,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )


def stop_ocean():
    global ocean_process

    if ocean_process is None:
        return

    log("[OCEAN] Ocean fades.")

    try:
        if hasattr(ocean_process, "player"):
            ocean_process.player.terminate()
        ocean_process.terminate()
    except Exception:
        pass

    ocean_process = None


def ocean_swell():
    # For now, preserve the transition timing without stopping
    # or restarting the continuous background ocean.
    log("[OCEAN] ~~~ swell ~~~")
    time.sleep(1.0)


# ============================================================
# IMU / physical interaction
# ============================================================

def movement_level():
    gx, gy, gz = imu.gyro
    return math.sqrt(gx * gx + gy * gy + gz * gz)


def get_acceleration():
    return imu.acceleration


def wait_for_pickup():

    log("")
    log("[SLEEP] EchoShell is resting.")
    log("Pick up the shell to wake it.")

    moving_since = None

    while running:

        movement = movement_level()

        if movement > MOVEMENT_THRESHOLD:

            if moving_since is None:
                moving_since = time.time()

            elif time.time() - moving_since >= WAKE_CONFIRM_TIME:
                log("[WAKE] Shell picked up.")
                return True

        else:
            moving_since = None

        time.sleep(0.05)

    return False


# ============================================================
# Proximity
# ============================================================

def get_proximity():
    try:
        return proximity_sensor.proximity
    except Exception:
        return 0


def wait_until_close():

    log("[READY] Bring EchoShell close to speak or listen.")

    while running:

        value = get_proximity()

        if value >= PROXIMITY_THRESHOLD:
            log("[PROXIMITY] User is close.")
            return True

        time.sleep(0.1)

    return False


# ============================================================
# Microphone
# ============================================================

def find_microphone():

    devices = sd.query_devices()

    for index, device in enumerate(devices):

        name = device["name"]

        if (
            MIC_HINT.lower() in name.lower()
            and device["max_input_channels"] > 0
        ):
            return index

    raise RuntimeError(
        "Could not find microphone: "
        + MIC_HINT
    )


MIC_DEVICE = find_microphone()


# ============================================================
# Speech recording
# ============================================================

def save_wav(path, audio):

    audio = np.asarray(audio, dtype=np.int16)

    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(audio.tobytes())


def listen_for_turn(wait_for_initial_speech=True):
    """
    Record one reflective speech turn.

    Logic:

    1. Wait for actual speech.
    2. Once speech starts, keep everything.
    3. Natural pauses shorter than 3 sec are preserved.
    4. 3 sec continuous silence ends the turn.

    Returns:
        Path to saved WAV, or None.
    """

    block_duration = 0.10
    blocksize = int(SAMPLE_RATE * block_duration)

    recorded_blocks = []

    speech_started = False
    speech_start_time = None
    last_speech_time = None

    log("[LISTENING] EchoShell is listening...")

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
        blocksize=blocksize,
        device=MIC_DEVICE
    ) as stream:

        while running:

            block, overflowed = stream.read(blocksize)

            mono = block[:, 0].copy()

            rms = float(
                np.sqrt(
                    np.mean(
                        mono.astype(np.float32) ** 2
                    )
                )
            )

            now = time.time()

            is_speech = rms >= SPEECH_RMS_THRESHOLD

            if is_speech:

                if not speech_started:
                    speech_started = True
                    speech_start_time = now
                    log("[VOICE] Speech started.")

                last_speech_time = now
                recorded_blocks.append(mono)

            elif speech_started:

                # Preserve pauses after speech starts.
                recorded_blocks.append(mono)

                silence = now - last_speech_time

                if silence >= ENDPOINT_SILENCE:

                    total_speech_time = (
                        last_speech_time
                        - speech_start_time
                    )

                    if total_speech_time >= MIN_SPEECH_TIME:
                        break

            # Before speech starts we do not save unlimited silence.

    if not recorded_blocks:
        return None

    audio = np.concatenate(recorded_blocks)

    output = (
        RECORDINGS_DIR
        / f"memory_{timestamp_string()}.wav"
    )

    save_wav(output, audio)

    log("[MEMORY] Recording saved.")

    return output


# ============================================================
# Persistent memory
# ============================================================

def load_memory_index():

    if not MEMORY_INDEX.exists():
        return []

    try:
        with open(
            MEMORY_INDEX,
            "r",
            encoding="utf-8"
        ) as f:
            return json.load(f)

    except Exception:
        return []


def save_memory_index(memories):

    with open(
        MEMORY_INDEX,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            memories,
            f,
            indent=2,
            ensure_ascii=True
        )


def archive_memory(recording_path):

    memories = load_memory_index()

    entry = {
        "file": recording_path.name,
        "timestamp": now_string(),

        # These will later be populated by transcription /
        # Wizard-of-Oz annotation.
        "transcript": "",
        "tags": []
    }

    memories.append(entry)

    save_memory_index(memories)

    log("[MEMORY] Added to long-term archive.")

    return entry


def choose_old_memory(current_filename):
    """
    Wait for the Wizard to select a past memory
    using wizard.py in a separate Terminal.
    """

    memory_map = {
        "joy": RECORDINGS_DIR / "joy.wav",
        "angry": RECORDINGS_DIR / "angry.wav",
        "homesick": RECORDINGS_DIR / "homesick.wav",
        "nervous": RECORDINGS_DIR / "nervous.wav",
        "presentation_nervous":
            RECORDINGS_DIR / "presentation_nervous.wav",
        "overwhelmed":
            RECORDINGS_DIR / "overwhelmed.wav",
    }

    choice_file = BASE_DIR / "wizard_choice.txt"

    # Clear any previous command.
    choice_file.write_text("")

    print()
    print("[WIZARD] Waiting for memory selection...")

    while running:

        try:
            choice = choice_file.read_text().strip().lower()
        except Exception:
            choice = ""

        if choice == "":
            time.sleep(0.1)
            continue

        # Consume command.
        choice_file.write_text("")

        if choice in ["none", "0"]:
            print("[WIZARD] No memory selected.")
            return None

        if choice not in memory_map:
            print("[WIZARD] Unknown selection.")
            continue

        path = memory_map[choice]

        if not path.exists():
            print(f"[WIZARD] Missing file: {path.name}")
            continue

        print(f"[WIZARD] Selected: {choice}")

        return path

    return None




# ============================================================
# Playback
# ============================================================

def play_memory_with_echo(path):
    print("[MEMORY] Playing an old echo.")

    temp_file = Path("/tmp/echoshell_memory.wav")

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel", "quiet",
            "-i", str(path),
            "-af", "aecho=0.8:0.25:120:0.10",
            "-ar", "44100",
            "-ac", "1",
            str(temp_file)
        ],
        check=True
    )

    subprocess.run(
        ["pw-play", str(temp_file)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    try:
        temp_file.unlink()
    except Exception:
        pass


# ============================================================
# Shell voice
# ============================================================

def shell_intro():
    voice_file = SOUNDS_DIR / "shell_recall.wav"

    print(
        "[SHELL] I see. Remember last week "
        "you had a similar feeling?"
    )

    if not voice_file.exists():
        print(f"[ERROR] Shell voice missing: {voice_file}")
        return

    subprocess.run(
        [
            "pw-play",
            str(voice_file)
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    time.sleep(0.5)

# ============================================================
# Reflection window
# ============================================================

def wait_for_reflection():

    log("")
    log(
        "[REFLECTION] EchoShell remains present "
        "for 10 seconds."
    )

    block_duration = 0.10
    blocksize = int(SAMPLE_RATE * block_duration)

    start = time.time()

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=CHANNELS,
        dtype="int16",
        blocksize=blocksize,
        device=MIC_DEVICE
    ) as stream:

        while running:

            block, overflowed = stream.read(blocksize)

            mono = block[:, 0]

            rms = float(
                np.sqrt(
                    np.mean(
                        mono.astype(np.float32) ** 2
                    )
                )
            )

            if rms >= SPEECH_RMS_THRESHOLD:
                log("[VOICE] User wants to continue.")
                return True

            if time.time() - start >= REFLECTION_WINDOW:
                log("[REFLECTION] No further speech.")
                return False

    return False


# ============================================================
# One conversation
# ============================================================

def conversation():

    if not wait_for_pickup():
        return

    # Intended design:
    # rubbing the shell wakes it.
    #
    # Prototype proxy:
    # pickup detected by IMU wakes it.
    start_ocean()

    # Physical closeness is a non-speech interaction cue.
    if not wait_until_close():
        return

    while running:

        # ----------------------------------------------------
        # LISTEN
        # ----------------------------------------------------

        new_memory = listen_for_turn()

        if new_memory is None:
            break

        # ----------------------------------------------------
        # STORE
        # ----------------------------------------------------

        archive_memory(new_memory)

        log(
            "[ENDPOINT] 3 seconds of silence. "
            "Turn complete."
        )

        ocean_swell()

        # ----------------------------------------------------
        # RETRIEVE OLD MEMORY
        # ----------------------------------------------------

        old_memory = choose_old_memory(
            new_memory.name
        )

        if old_memory is None:

            log(
                "[MEMORY] No earlier memory exists yet."
            )

        else:

            shell_intro()

            ocean_swell()

            play_memory_with_echo(old_memory)

            ocean_swell()

        # ----------------------------------------------------
        # REFLECT / CONTINUE
        # ----------------------------------------------------

        wants_to_continue = wait_for_reflection()

        if wants_to_continue:

            log(
                "[LOOP] Returning to listening."
            )

            continue

        break

    stop_ocean()

    log("[SLEEP] Conversation ended.")


# ============================================================
# Main
# ============================================================

def cleanup():

    global running

    running = False

    stop_ocean()


try:

    log("=" * 48)
    log("       EchoShell - A Shell That Remembers")
    log("=" * 48)

    while running:
        conversation()

except KeyboardInterrupt:

    log("")
    log("[SYSTEM] Stopping EchoShell.")

finally:

    cleanup()
