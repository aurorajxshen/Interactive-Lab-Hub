# Dancing Garden: Musician

The Musician mixes a generative soundtrack that grows from a quiet garden into a dance party.
A Pi reads a Qwiic Joystick and an APDS-9960 gesture sensor, a browser page (Tone.js) makes the sound,
and everything is shared over MQTT so the Dancer and Gardener can react to it (and shape it).

```
Qwiic Joystick (0x20) ─┐
                       ├─> musician_server.py ──Socket.IO──> browser page (Tone.js, speakers)
APDS-9960 (0x39) ──────┘          │  ▲
                                  ▼  │
                         MQTT  IDD/<team>/...
```

## Run it

On the Pi with the two sensors (Qwiic cable, both on the same I2C bus):

```bash
cd "Lab 6"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-pi.txt
pip install Flask Flask-SocketIO simple-websocket     # the musician server needs these as well
python musician/musician_server.py --team <yourteam>
```

Then open `http://<pi-ip>:5100` on any device with speakers and press **Start the garden**
(browsers only allow sound after a click). The page loads Tone.js and Socket.IO from a CDN, so it needs internet.

Useful flags:

| Flag | Meaning |
|---|---|
| `--team NAME` | MQTT prefix `IDD/NAME/...` (default `dancinggarden`, **agree on one name as a team**) |
| `--no-hardware` | Page only; play it with the keyboard |
| `--no-mqtt` | Do not talk to the broker |
| `--invert-x`, `--invert-y` | Flip a joystick axis if it feels backwards |
| `--hover-level N`, `--hover-hold S` | How near / how long a hand must stay over the sensor to trigger a sparkle |
| `--debug-sensors` | Print every sensor event |

Do **not** run it together with `pixel_grid_publisher.py`: both want the APDS-9960.

## Controls (Mini DJ mode, fixed 100 BPM)

| Input | What it does |
|---|---|
| Joystick X | Crossfade Ambient Garden ↔ Garden Disco. Push to move, release to keep the mix |
| Joystick Y | DJ filter: down = muffled, up = thin and bright, release = back to neutral |
| Joystick click | **Drop**: a bar of build-up (filter closes, riser, snare roll), then everything lands on the next bar line and stays full for 4 bars |
| Swipe up / down | Add / remove a layer (Atmosphere, Rhythm, Bass, Melody, Sparkles), applied on the next bar |
| Swipe left / right | Switch lead instrument: Kalimba, Marimba, Bells (applied on the next bar) |
| Hold a hand over the sensor ~0.6 s | Sparkle (bell arpeggio) |

Everything is quantised to the beat or bar, so it always stays in time.
The page has an **Energy (v1)** mode too (joystick X = tempo, Y = energy). It is kept for comparison.

Keyboard stand-ins: arrow keys = joystick, Enter = click, `W A S D` = swipes, Space = hover.

## MQTT topics (prefix `IDD/<team>/`)

**Published by the Musician**

| Topic | Payload | When |
|---|---|---|
| `music/beat` | JSON `{"bar": n, "beat": 0-3}` | every quarter note |
| `music/bpm` | number | every bar |
| `music/energy` | `0`-`4`, how many layers are playing | every bar |
| `music/mix` | `0.00`-`1.00` (0 = Ambient, 1 = Disco) | every bar |
| `music/instrument` | `Kalimba` / `Marimba` / `Bells` | every bar |
| `music/drop` | JSON `{"bar": n}` | the moment a Drop lands |

**Read by the Musician**

| Topic | Payload | Effect |
|---|---|---|
| `dancer/energy` | number `0`-`1` | Bigger movement = harder playing and brighter filter. Above ~0.7 (0.5 during a Drop) with enough layers: **Bloom**, octave doubling and more sparkles |
| `garden/weather` | `none` / `sun` / `rain` / `wind` / `bugs` | sun = brighter, rain = droplets, wind = airy noise and more chimes, bugs = chirps |

Handy ideas for the others: the Dancer can step on `music/beat`; the Gardener can make the garden bloom on `music/drop`.
Try it without the real devices:

```bash
mosquitto_pub -h farlab.infosci.cornell.edu -p 1883 -u idd -P 'device@theFarm' -t 'IDD/<team>/dancer/energy' -m 0.9
mosquitto_pub -h farlab.infosci.cornell.edu -p 1883 -u idd -P 'device@theFarm' -t 'IDD/<team>/garden/weather' -m rain
mosquitto_sub -h farlab.infosci.cornell.edu -p 1883 -u idd -P 'device@theFarm' -t 'IDD/<team>/music/#' -v
```

## Notes

- Music: C major pentatonic over Cmaj7, Am7, Fmaj7, G6 (one chord per bar), so any combination of inputs sounds consonant.
- Gesture directions depend on how the APDS-9960 is mounted. If a swipe is reversed, change `GESTURE_NAMES` in `musician_server.py`.
- The joystick is spring-loaded, so X is a *rate* control and Y is an *absolute* control (see the table above).
- Sound is synthesised in the browser, not on the Pi, so the page can run on a laptop next to the speakers.
- Not yet tuned by a wider audience: filter range and the loudness balance during a Drop are first guesses.
