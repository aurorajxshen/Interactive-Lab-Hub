"""Dancing Garden — live compositable garden background.
Run on Mac/PC: pip install pygame paho-mqtt; python garden_background.py
Optional MQTT: --mqtt; keyboard always works: 0 cloud, 2 rain, 3 rainbow,
5 wind, 6 lightning, 8 fireflies, 9 night, 1 day (or S).
"""
import argparse
import json
import math
import random
import threading
import time
from dataclasses import dataclass, field

import pygame

W, H = 1200, 750
FPS = 60
TOPIC = 'IDD/dancinggarden/gardener'
BROKER = 'farlab.infosci.cornell.edu'

# Drawing uses a soft, airy palette to leave space for the dancer's flower.
DAY_TOP = (113, 169, 227)
DAY_BOTTOM = (247, 226, 224)
NIGHT_TOP = (12, 22, 59)
NIGHT_BOTTOM = (64, 76, 126)

@dataclass
class GardenState:
    night: bool = False
    cloud: bool = False
    rain: bool = False
    rainbow: bool = False
    wind: bool = False
    lightning: bool = False
    fireflies: bool = False
    night_mix: float = 0.0
    lock: threading.Lock = field(default_factory=threading.Lock)

    def touch(self, electrode):
        with self.lock:
            if electrode == 9:
                self.night = True
            elif electrode == 11:
                self.night = False
            else:
                key = {0: 'cloud', 2: 'rain', 3: 'rainbow', 5: 'wind',
                       6: 'lightning', 8: 'fireflies'}.get(electrode)
                if key:
                    setattr(self, key, not getattr(self, key))
            print('Gardener:', electrode, 'night' if self.night else 'day',
                  {k: getattr(self, k) for k in ('cloud', 'rain', 'rainbow', 'wind', 'lightning', 'fireflies')})

    def snapshot(self, dt):
        with self.lock:
            target = 1.0 if self.night else 0.0
            self.night_mix += (target - self.night_mix) * min(1.0, dt * 1.4)
            return self.night_mix, {k: getattr(self, k) for k in
                ('cloud', 'rain', 'rainbow', 'wind', 'lightning', 'fireflies')}

def lerp(a, b, t):
    return a + (b-a)*t

def mix(a, b, t):
    return tuple(int(lerp(x, y, t)) for x, y in zip(a, b))

def ellipse_glow(dst, x, y, rx, ry, rgb, alpha=30, rings=9):
    # Build glow on small surfaces to keep real-time animation fast.
    rx, ry = max(2, int(rx)), max(2, int(ry))
    layer = pygame.Surface((2*rx+4, 2*ry+4), pygame.SRCALPHA)
    for i in range(rings, 0, -1):
        p = i / rings
        pygame.draw.ellipse(layer, (*rgb, int(alpha*(1-p*.82))),
            pygame.Rect(int(rx*(1-p))+2, int(ry*(1-p))+2,
                        max(1, int(2*rx*p)), max(1, int(2*ry*p))))
    dst.blit(layer, (int(x-rx-2), int(y-ry-2)))

def cloud_shape(dst, x, y, scale, alpha):
    w, h = int(310*scale), int(130*scale)
    layer = pygame.Surface((w+40, h+50), pygame.SRCALPHA)
    parts = [(0.23, .58, .24, .33), (.40, .35, .29, .49),
             (.61, .48, .32, .40), (.77, .65, .21, .25)]
    for px, py, rx, ry in parts:
        for j in range(6, 0, -1):
            grow = j * 4
            rect = pygame.Rect(int((px-rx)*w-grow+20), int((py-ry)*h-grow+25),
                               int(2*rx*w+2*grow), int(2*ry*h+2*grow))
            pygame.draw.ellipse(layer, (255, 247, 253, max(1, int(alpha/16))), rect)
        pygame.draw.ellipse(layer, (249, 249, 255, int(alpha*.48)),
            pygame.Rect(int((px-rx)*w+20), int((py-ry)*h+25), int(2*rx*w), int(2*ry*h)))
    dst.blit(layer, (int(x), int(y)))

def draw_gradient(dst, night):
    for y in range(H):
        t = y / H
        top = mix(DAY_TOP, NIGHT_TOP, night)
        bottom = mix(DAY_BOTTOM, NIGHT_BOTTOM, night)
        col = mix(top, bottom, t**.85)
        pygame.draw.line(dst, col, (0, y), (W, y))

def draw_landscape(dst, night, t):
    # Abstract gauzy ground and botanical shadows; center kept open for dancer.
    ellipse_glow(dst, W*.5, H*.96, W*.7, H*.29,
                 mix((255, 231, 218), (72, 105, 157), night), 42)
    for i in range(8):
        x = (i*177+50) % W
        y = H - 18 + math.sin(i*2.2)*15
        color = mix((133, 188, 179), (67, 113, 146), night)
        ellipse_glow(dst, x, y, 165, 74, color, 21)
    # Light, translucent leaf silhouettes at the edges.
    leaves = pygame.Surface((W, H), pygame.SRCALPHA)
    for side in (0, 1):
        rootx = -22 if side == 0 else W+22
        for i in range(7):
            y = H - 28 - i*69
            dx = (125+18*(i%3)) * (1 if side == 0 else -1)
            sway = math.sin(t*.45+i)*6
            pygame.draw.line(leaves, (131, 170, 173, 32), (rootx, H),
                             (rootx+dx+sway, y), 2)
            ellipse = pygame.Rect(int(rootx+dx+sway-27), int(y-12), 55, 26)
            pygame.draw.ellipse(leaves, (159, 194, 191, 26), ellipse)
    dst.blit(leaves, (0, 0))

def draw_sky_lights(dst, night, t, stars):
    # Sun fades as the moon comes in.
    sun_alpha = int(120*(1-night))
    if sun_alpha:
        ellipse_glow(dst, W*.78, H*.24, 205, 205, (255, 247, 224), sun_alpha)
        pygame.draw.circle(dst, mix((255, 248, 235), NIGHT_TOP, night),
                           (int(W*.78), int(H*.24)), 54)
    if night > .02:
        ellipse_glow(dst, W*.78, H*.23, 160, 160, (205, 220, 255), int(65*night))
        moon = pygame.Surface((125, 125), pygame.SRCALPHA)
        pygame.draw.circle(moon, (248, 249, 255, int(245*night)), (62, 62), 45)
        pygame.draw.circle(moon, (229, 236, 255, int(60*night)), (48, 50), 10)
        dst.blit(moon, (int(W*.78-62), int(H*.23-62)))
        star_layer = pygame.Surface((W, H), pygame.SRCALPHA)
        for x, y, phase, r in stars:
            a = int(night*(45+65*(.5+.5*math.sin(t*1.2+phase))))
            pygame.draw.circle(star_layer, (250, 249, 255, a), (x, y), r)
        dst.blit(star_layer, (0, 0))

def draw_rainbow(dst, t):
    layer = pygame.Surface((W, H), pygame.SRCALPHA)
    colors = [(255, 139, 155), (255, 193, 145), (255, 242, 170),
              (176, 237, 210), (165, 213, 255), (207, 183, 255)]
    # Large soft arc behind the dancer, drawn with overlapping transparent strokes.
    rect = pygame.Rect(195, 155, 810, 690)
    for i, c in enumerate(colors):
        pygame.draw.arc(layer, (*c, 24), rect.inflate(-i*24, -i*24), math.pi*.06, math.pi*.94, 17)
    dst.blit(layer, (0, 0))
    for i, c in enumerate(colors):
        x = W*(.17+i*.135)
        y = H*(.40+.06*math.sin(t*.55+i))
        ellipse_glow(dst, x, y, 180, 125, c, int(10+5*math.sin(t*.8+i)))

def draw_rain(dst, drops, dt, wind):
    layer = pygame.Surface((W, H), pygame.SRCALPHA)
    for p in drops:
        p[1] += p[3]*dt
        p[0] += (65 if wind else -12)*dt
        if p[1] > H+30:
            p[1] = -random.uniform(5, 90)
            p[0] = random.uniform(0, W)
        if p[0] > W+20:
            p[0] = -20
        x, y = int(p[0]), int(p[1])
        pygame.draw.line(layer, (228, 239, 255, 85), (x, y),
                         (x+int(8 if wind else -2), y+int(p[2])), 1)
    dst.blit(layer, (0, 0))

def draw_wind(dst, t):
    layer = pygame.Surface((W, H), pygame.SRCALPHA)
    for i in range(13):
        y = 100 + i*46 + 16*math.sin(t*.8+i)
        x = ((t*(120+i*5)+i*151) % (W+330))-240
        points = []
        for j in range(17):
            px = x + j*14
            py = y + 8*math.sin(j*.32+t*.8+i)
            points.append((int(px), int(py)))
        pygame.draw.lines(layer, (245, 250, 255, 85 if i%3 else 115), False, points, 2)
    dst.blit(layer, (0, 0))

def draw_fireflies(dst, bugs, t, night):
    layer = pygame.Surface((W, H), pygame.SRCALPHA)
    for x, y, phase, speed, size in bugs:
        bx = x + math.sin(t*speed+phase)*27
        by = y + math.cos(t*(speed*.7)+phase)*18
        a = max(0, int((.5+.5*math.sin(t*2.7+phase))*190))
        pygame.draw.circle(layer, (255, 245, 168, int(a*.2)), (int(bx), int(by)), size*5)
        pygame.draw.circle(layer, (255, 250, 203, a), (int(bx), int(by)), size)
    dst.blit(layer, (0, 0))

def lightning_alpha(t):
    # Irregular flashes with brief dark gaps; never draws a bolt.
    cycle = t % 5.7
    if cycle < .085: return 210
    if .16 < cycle < .23: return 155
    if .30 < cycle < .38: return 240
    if .39 < cycle < .47: return 70
    return 0

def draw_ui(dst, state, font):
    # Minimal status overlay, hide with H; useful for demo and debugging.
    labels = [('DAY' if not state['night'] else 'NIGHT', True)]
    labels += [(k.upper(), state[k]) for k in ('cloud', 'rain', 'rainbow', 'wind', 'lightning', 'fireflies')]
    x = 22
    for label, active in labels:
        txt = font.render(label, True, (31, 50, 82) if not state['night'] else (240, 244, 255))
        w = txt.get_width()+20
        bg = pygame.Surface((w, 28), pygame.SRCALPHA)
        bg.fill((255, 255, 255, 115 if active else 35))
        dst.blit(bg, (x, 18))
        dst.blit(txt, (x+10, 24))
        x += w+7

def mqtt_thread(state, stop):
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        print('MQTT disabled: pip install paho-mqtt')
        return
    def on_connect(client, userdata, flags, reason_code, properties=None):
        print('MQTT connected:', reason_code)
        client.subscribe(TOPIC)
    def on_message(client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode('utf-8'))
            if data.get('event', 'touch') != 'touch':
                return
            state.touch(int(data['electrode']))
        except (ValueError, KeyError, TypeError, UnicodeDecodeError) as exc:
            print('Ignored MQTT message:', exc)
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set('idd', 'device@theFarm')
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(BROKER, 1883, 60)
        client.loop_start()
        while not stop.is_set():
            stop.wait(.2)
    except Exception as exc:
        print('MQTT connection failed:', exc)
    finally:
        try:
            client.loop_stop()
            client.disconnect()
        except Exception:
            pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mqtt', action='store_true', help='listen to Pi touch events over MQTT')
    parser.add_argument('--fullscreen', action='store_true')
    args = parser.parse_args()
    pygame.init()
    flags = pygame.FULLSCREEN if args.fullscreen else pygame.RESIZABLE
    screen = pygame.display.set_mode((W, H), flags)
    pygame.display.set_caption('Dancing Garden | Gardener Stage')
    canvas = pygame.Surface((W, H))
    clock = pygame.time.Clock()
    font = pygame.font.SysFont('Arial', 15)
    state = GardenState()
    stop = threading.Event()
    if args.mqtt:
        threading.Thread(target=mqtt_thread, args=(state, stop), daemon=True).start()
    rng = random.Random(15)
    stars = [(rng.randrange(20, W-20), rng.randrange(18, int(H*.72)), rng.random()*6.28, rng.choice([1,1,2])) for _ in range(95)]
    bugs = [(rng.randrange(100, W-100), rng.randrange(130, H-65), rng.random()*6.28, rng.uniform(.3, 1.3), rng.choice([1,2,2,3])) for _ in range(45)]
    drops = [[rng.uniform(0,W), rng.uniform(0,H), rng.uniform(11,28), rng.uniform(300,680)] for _ in range(230)]
    start = time.monotonic()
    show_ui = True
    running = True
    while running:
        dt = min(clock.tick(FPS)/1000, .06)
        t = time.monotonic()-start
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_h:
                    show_ui = not show_ui
                elif event.key in (pygame.K_1, pygame.K_s):
                    state.touch(11)
                else:
                    keys = {pygame.K_0:0, pygame.K_2:2, pygame.K_3:3,
                            pygame.K_5:5, pygame.K_6:6, pygame.K_8:8,
                            pygame.K_9:9}
                    if event.key in keys:
                        state.touch(keys[event.key])
        night, active = state.snapshot(dt)
        draw_gradient(canvas, night)
        draw_sky_lights(canvas, night, t, stars)
        if active['rainbow']:
            draw_rainbow(canvas, t)
        if active['cloud']:
            for i in range(5):
                cloud_shape(canvas, ((i*290+t*(9+i*2))%(W+400))-260,
                            95+i*85+math.sin(t*.3+i)*10, .7+(i%3)*.2,
                            int(75+night*28))
        draw_landscape(canvas, night, t)
        if active['wind']:
            draw_wind(canvas, t)
        if active['rain']:
            draw_rain(canvas, drops, dt, active['wind'])
        if active['fireflies']:
            draw_fireflies(canvas, bugs, t, night)
        if active['lightning']:
            alpha = lightning_alpha(t)
            if alpha:
                flash = pygame.Surface((W,H), pygame.SRCALPHA)
                flash.fill((255, 255, 255, alpha))
                canvas.blit(flash, (0,0))
        if show_ui:
            draw_ui(canvas, dict(active, night=night>.5), font)
        sw, sh = screen.get_size()
        screen.blit(pygame.transform.smoothscale(canvas, (sw,sh)), (0,0))
        pygame.display.flip()
    stop.set()
    pygame.quit()

if __name__ == '__main__':
    main()
