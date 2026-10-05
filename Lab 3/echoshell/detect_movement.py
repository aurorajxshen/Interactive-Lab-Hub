import time
import math
import board
from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC

# -----------------------------
# EchoShell movement detector
# -----------------------------

MOVEMENT_THRESHOLD = 0.30  # radians/second

i2c = board.I2C()
sensor = LSM6DS3TRC(i2c)

print("EchoShell Movement Detector")
print("Move the shell to test the IMU.")
print("Press Ctrl+C to stop.\n")

while True:

    gyro_x, gyro_y, gyro_z = sensor.gyro

    # Combine rotation around all three axes into one value.
    movement = math.sqrt(
        gyro_x**2 +
        gyro_y**2 +
        gyro_z**2
    )

    if movement > MOVEMENT_THRESHOLD:
        state = "MOVING"
    else:
        state = "STILL"

    print(
        f"{state:6} | "
        f"movement={movement:.2f} rad/s"
    )

    time.sleep(0.2)
