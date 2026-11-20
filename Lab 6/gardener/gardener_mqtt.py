
"""Run on the Gardener Raspberry Pi. Publishes only new touch events."""
import json
import time
import board
import busio
import adafruit_mpr121
import paho.mqtt.client as mqtt

TOPIC = 'IDD/dancinggarden/gardener'
BUTTONS = {0:'cloud', 2:'rain', 3:'rainbow', 5:'wind',
           6:'lightning', 8:'fireflies', 9:'night', 11:'day'}

i2c = busio.I2C(board.SCL, board.SDA)
sensor = adafruit_mpr121.MPR121(i2c)
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set('idd', 'device@theFarm')
client.connect('farlab.infosci.cornell.edu', 1883, 60)
client.loop_start()

previous = {pin: False for pin in BUTTONS}
last_touch = {pin: 0.0 for pin in BUTTONS}

print('Gardener touch -> MQTT; Ctrl+C to stop')

try:
    while True:
        now = time.monotonic()
        for pin, effect in BUTTONS.items():
            pressed = bool(sensor[pin].value)
            if pressed and not previous[pin] and now-last_touch[pin] > .25:
                payload = {
                    'device': 'gardener',
                    'event': 'touch',
                    'electrode': pin,
                    'effect': effect
                }
                info = client.publish(TOPIC, json.dumps(payload), qos=0)
                print(f'TOUCH {pin}: {effect} -> MQTT ({info.rc})', flush=True)
                last_touch[pin] = now
            previous[pin] = pressed
        time.sleep(.025)

except KeyboardInterrupt:
    print('Stopped')
finally:
    client.loop_stop()
    client.disconnect()
