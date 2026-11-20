
import time
import board
import busio
import adafruit_mpr121

# -----------------------------------
# Gardener - Capacitive Touch Test
# Dancing Garden / Lab 6
# -----------------------------------

# MPR121 electrode mapping
BUTTONS = {
    0: ("CLOUD", "Clouds appear in the garden"),
    2: ("RAIN", "Rain starts falling"),
    3: ("RAINBOW", "A rainbow appears"),
    5: ("WIND", "Wind blows through the garden"),
    6: ("LIGHTNING", "Lightning flashes"),
    8: ("FIREFLIES", "Fireflies light up"),
    9: ("NIGHT", "Switch to nighttime"),
    11: ("DAY", "Switch to daytime"),
}

# Initialize I2C and MPR121
i2c = busio.I2C(board.SCL, board.SDA)
mpr121 = adafruit_mpr121.MPR121(i2c)

print("=" * 50)
print("DANCING GARDEN - GARDENER TOUCH TEST")
print("=" * 50)

for pin, (name, _) in BUTTONS.items():
    print(f"Electrode {pin:2d} -> {name}")

print("\nTouch the copper pads to test.")
print("Press Ctrl+C to stop.\n")

# Track previous touch states
previous_states = {
    pin: False for pin in BUTTONS
}

try:
    while True:
        for pin, (name, description) in BUTTONS.items():

            # Read the current electrode state
            is_touched = mpr121[pin].value
            was_touched = previous_states[pin]

            # Detect new touch
            if is_touched and not was_touched:
                print(f"[TOUCH]   Pin {pin:2d} | {name}")
                print(f"          -> {description}")

            # Detect release
            elif not is_touched and was_touched:
                print(f"[RELEASE] Pin {pin:2d} | {name}")

            previous_states[pin] = is_touched

        time.sleep(0.05)

except KeyboardInterrupt:
    print("\nGardener touch test stopped.")
