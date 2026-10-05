import time
import board
from adafruit_lsm6ds.lsm6ds3trc import LSM6DS3TRC

# Connect to the IMU through Raspberry Pi's I2C bus
i2c = board.I2C()
sensor = LSM6DS3TRC(i2c)

print("EchoShell IMU test")
print("Move the sensor around. Press Ctrl+C to stop.\n")

while True:
    # Acceleration in m/s^2
    accel_x, accel_y, accel_z = sensor.acceleration

    # Gyroscope in radians/s
    gyro_x, gyro_y, gyro_z = sensor.gyro

    print(
        f"Acceleration: "
        f"X={accel_x:6.2f}, "
        f"Y={accel_y:6.2f}, "
        f"Z={accel_z:6.2f} m/s^2"
    )

    print(
        f"Gyroscope:    "
        f"X={gyro_x:6.2f}, "
        f"Y={gyro_y:6.2f}, "
        f"Z={gyro_z:6.2f} rad/s"
    )

    print("-" * 55)

    time.sleep(0.5)
