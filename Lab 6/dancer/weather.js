
/**
 * Dancing Garden — Gardener Weather Overlay
 *
 * Responsive Canvas weather layer for Dancer's HTML interface.
 * Does not change Dancer's Three.js flower or MediaPipe logic.
 *
 * Usage:
 *   import { createGardenerWeather } from "./weather.js";
 *
 *   const weather = createGardenerWeather(
 *     document.getElementById("garden"),
 *     { startAtNight: true }
 *   );
 *
 *   // Inside existing gardenerTouch(e):
 *   weather.touch(e);
 *
 * IMPORTANT:
 * Disable the older Gardener weather rendering in index.html
 * to prevent duplicated effects.
 */

export function createGardenerWeather(container, options = {}) {
  if (!container) {
    throw new Error("Gardener weather: missing #garden container");
  }

  // =====================================================
  // 1. RESPONSIVE CANVAS
  // =====================================================

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");

  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "3",
    display: "block"
  });

  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
  }

  container.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });

  if (!ctx) {
    throw new Error("Gardener weather: Canvas 2D unavailable");
  }

  // =====================================================
  // 2. WEATHER STATE
  // =====================================================

  const flags = {
    cloud: false,
    rain: false,
    rainbow: false,
    wind: false,
    lightning: false,
    fireflies: false
  };

  let night = options.startAtNight ?? true;

  let width = 1;
  let height = 1;
  let dpr = 1;

  let raf = 0;
  let lastTime = 0;

  let flashTime = 0;
  let flashStrength = 0;
  let nextFlash = 0;

  const random = (a, b) =>
    a + Math.random() * (b - a);

  const clamp = (v, a, b) =>
    Math.max(a, Math.min(b, v));

  const mix = (a, b, t) =>
    a + (b - a) * t;

  const lerpColor = (a, b, t) =>
    a.map((x, i) => Math.round(mix(x, b[i], t)));

  const rgb = (c, a = 1) =>
    `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  // Dreamy pastel palette
  const dayTop = [111, 168, 223];
  const dayBottom = [252, 220, 222];

  const nightTop = [13, 19, 49];
  const nightBottom = [54, 48, 83];

  let nightMix = night ? 1 : 0;

  // =====================================================
  // 3. PARTICLE INITIALIZATION
  // =====================================================

  const clouds = Array.from({ length: 6 }, () => ({
    x: Math.random(),
    y: random(0.09, 0.46),
    size: random(0.15, 0.28),
    speed: random(0.007, 0.018),
    opacity: random(0.16, 0.34)
  }));

  const drops = Array.from({ length: 165 }, () => ({
    x: Math.random(),
    y: Math.random(),
    length: random(0.018, 0.045),
    speed: random(0.55, 1.1),
    alpha: random(0.18, 0.55)
  }));

  const flies = Array.from({ length: 35 }, () => ({
    x: Math.random(),
    y: random(0.15, 0.88),
    size: random(1.2, 3.2),
    phase: random(0, Math.PI * 2),
    speed: random(0.5, 1.4)
  }));

  const wisps = Array.from({ length: 14 }, () => ({
    x: Math.random(),
    y: random(0.1, 0.9),
    length: random(0.10, 0.24),
    speed: random(0.08, 0.20),
    phase: random(0, Math.PI * 2)
  }));

  // =====================================================
  // 4. RESPONSIVE RESIZING
  // =====================================================

  function resize() {
    const rect = container.getBoundingClientRect();

    if (rect.width < 1 || rect.height < 1) {
      return;
    }

    width = rect.width;
    height = rect.height;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);

  resize();

  // =====================================================
  // 5. MPR121 TOUCH CONTROL
  // =====================================================

  const electrodes = {
    0: "cloud",
    2: "rain",
    3: "rainbow",
    5: "wind",
    6: "lightning",
    8: "fireflies",
    9: "night",
    11: "day"
  };

  function touch(electrode) {
    const effect = electrodes[Number(electrode)];

    if (!effect) {
      return false;
    }

    if (effect === "night") {
      night = true;
    } else if (effect === "day") {
      night = false;
    } else {
      flags[effect] = !flags[effect];
    }

    if (effect === "lightning" && flags.lightning) {
      nextFlash = 0;
    }

    return true;
  }

  function setState(next = {}) {
    for (const key of Object.keys(flags)) {
      if (typeof next[key] === "boolean") {
        flags[key] = next[key];
      }
    }

    if (typeof next.night === "boolean") {
      night = next.night;
    }
  }

  function getState() {
    return {
      ...flags,
      night
    };
  }

  // =====================================================
  // 6. SKY — DAY / NIGHT
  // =====================================================

  function drawSky() {
    const top = lerpColor(dayTop, nightTop, nightMix);
    const bottom = lerpColor(dayBottom, nightBottom, nightMix);

    const gradient = ctx.createLinearGradient(
      0, 0, 0, height
    );

    gradient.addColorStop(0, rgb(top, 0.36));
    gradient.addColorStop(1, rgb(bottom, 0.19));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Sun / moon position follows viewport proportions
    const x = width * 0.81;
    const y = height * 0.19;

    const radius = Math.min(width, height) * 0.11;

    // Soft atmospheric halo
    const halo = ctx.createRadialGradient(
      x, y, 0,
      x, y, radius * 3.5
    );

    halo.addColorStop(
      0,
      nightMix > 0.5
        ? "rgba(198,210,255,0.26)"
        : "rgba(255,232,184,0.27)"
    );

    halo.addColorStop(
      1,
      "rgba(255,255,255,0)"
    );

    ctx.fillStyle = halo;

    ctx.fillRect(
      x - radius * 3.5,
      y - radius * 3.5,
      radius * 7,
      radius * 7
    );

    // Sun or moon
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.52, 0, Math.PI * 2);

    ctx.fillStyle =
      nightMix > 0.5
        ? "rgba(229,235,255,0.55)"
        : "rgba(255,246,214,0.47)";

    ctx.fill();
  }

  // =====================================================
  // 7. CLOUDS
  // =====================================================

  function drawClouds(dt) {
    if (!flags.cloud) return;

    for (const cloud of clouds) {
      cloud.x += cloud.speed * dt;

      if (cloud.x > 1.25) {
        cloud.x = -0.25;
      }

      const x = cloud.x * width;
      const y = cloud.y * height;

      const rw = cloud.size * width;
      const rh = rw * 0.36;

      ctx.save();
      ctx.globalAlpha = cloud.opacity;

      const parts = [
        [-0.27, 0.08, 0.36, 0.7],
        [0, -0.1, 0.53, 1],
        [0.27, 0.04, 0.38, 0.72]
      ];

      for (const [dx, dy, sx, sy] of parts) {
        const cx = x + dx * rw;
        const cy = y + dy * rh;

        const rr = Math.max(
          rw * sx,
          rh * sy
        );

        const gradient = ctx.createRadialGradient(
          cx, cy, 0,
          cx, cy, rr
        );

        gradient.addColorStop(
          0,
          "rgba(255,255,255,0.9)"
        );

        gradient.addColorStop(
          0.55,
          "rgba(255,255,255,0.46)"
        );

        gradient.addColorStop(
          1,
          "rgba(255,255,255,0)"
        );

        ctx.save();

        ctx.translate(cx, cy);
        ctx.scale(1, (rh / rw) * 1.7);

        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();
    }
  }

  // =====================================================
  // 8. RAINBOW
  // =====================================================

  function drawRainbow() {
    if (!flags.rainbow) return;

    const cx = width * 0.52;
    const cy = height * 0.91;

    const rx = Math.min(
      width * 0.42,
      height * 0.73
    );

    const ry = rx * 0.58;

    const colors = [
      "#ff9baa",
      "#ffcfaa",
      "#fff0b8",
      "#bcebd4",
      "#b7dafa",
      "#d4c5ff"
    ];

    ctx.save();

    ctx.globalAlpha = 0.40;
    ctx.lineCap = "round";

    colors.forEach((color, i) => {
      ctx.beginPath();

      ctx.ellipse(
        cx,
        cy,
        rx - i * rx * 0.052,
        ry - i * ry * 0.052,
        0,
        Math.PI,
        2 * Math.PI
      );

      ctx.strokeStyle = color;

      ctx.lineWidth = Math.max(
        2,
        rx * 0.025
      );

      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      ctx.stroke();
    });

    ctx.restore();
  }

  // =====================================================
  // 9. RAIN
  // =====================================================

  function drawRain(dt) {
    if (!flags.rain) return;

    ctx.save();
    ctx.lineCap = "round";

    const slant = flags.wind
      ? width * 0.015
      : width * 0.004;

    for (const drop of drops) {
      drop.y += drop.speed * dt;

      drop.x += (
        flags.wind ? 0.18 : 0.025
      ) * dt;

      if (drop.y > 1.06) {
        drop.y = -0.06;
        drop.x = Math.random();
      }

      if (drop.x > 1.04) {
        drop.x = -0.04;
      }

      const x = drop.x * width;
      const y = drop.y * height;

      ctx.strokeStyle =
        `rgba(198,222,255,${drop.alpha})`;

      ctx.lineWidth = Math.max(
        1,
        width / 1000
      );

      ctx.beginPath();
      ctx.moveTo(x, y);

      ctx.lineTo(
        x - slant,
        y + drop.length * height
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  // =====================================================
  // 10. WIND
  // =====================================================

  function drawWind(time, dt) {
    if (!flags.wind) return;

    ctx.save();
    ctx.lineCap = "round";

    for (const wisp of wisps) {
      wisp.x += wisp.speed * dt;

      if (wisp.x > 1.22) {
        wisp.x = -0.22;
      }

      const x = wisp.x * width;

      const y = (
        wisp.y +
        0.015 * Math.sin(time + wisp.phase)
      ) * height;

      const len = wisp.length * width;

      ctx.beginPath();

      ctx.moveTo(
        x - len / 2,
        y
      );

      ctx.bezierCurveTo(
        x - len * 0.18,
        y - 10,
        x + len * 0.18,
        y + 10,
        x + len / 2,
        y
      );

      ctx.strokeStyle =
        "rgba(225,241,255,0.22)";

      ctx.lineWidth = Math.max(
        1.1,
        Math.min(width, height) * 0.003
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  // =====================================================
  // 11. FIREFLIES
  // =====================================================

  function drawFireflies(time, dt) {
    if (!flags.fireflies) return;

    for (const fly of flies) {
      fly.x += (
        Math.sin(time * fly.speed + fly.phase) *
        dt * 0.012
      );

      fly.y += (
        Math.cos(
          time * fly.speed * 0.8 + fly.phase
        ) * dt * 0.009
      );

      fly.x = clamp(fly.x, 0.03, 0.97);
      fly.y = clamp(fly.y, 0.06, 0.94);

      const alpha =
        0.15 +
        0.7 * Math.max(
          0,
          Math.sin(time * 2.2 + fly.phase)
        );

      const x = fly.x * width;
      const y = fly.y * height;

      const radius =
        fly.size *
        Math.min(width, height) / 550;

      const glow = ctx.createRadialGradient(
        x, y, 0,
        x, y, radius * 5
      );

      glow.addColorStop(
        0,
        `rgba(255,243,168,${alpha})`
      );

      glow.addColorStop(
        0.25,
        `rgba(255,238,175,${alpha * 0.35})`
      );

      glow.addColorStop(
        1,
        "rgba(255,238,175,0)"
      );

      ctx.fillStyle = glow;

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        radius * 5,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  }

  // =====================================================
  // 12. LIGHTNING — FULL SCREEN FLASH
  // =====================================================

  function drawLightning(time, dt) {
    if (!flags.lightning) {
      flashStrength = 0;
      nextFlash = 0;
      return;
    }

    nextFlash -= dt;

    if (nextFlash <= 0) {
      flashTime = time;
      flashStrength = random(0.38, 0.83);
      nextFlash = random(2.2, 5.4);
    }

    const age = time - flashTime;

    let alpha = 0;

    if (age < 0.075) {
      alpha = flashStrength;
    } else if (age > 0.15 && age < 0.21) {
      alpha = flashStrength * 0.65;
    } else if (age > 0.28 && age < 0.35) {
      alpha = flashStrength * 0.85;
    }

    if (alpha > 0) {
      ctx.fillStyle =
        `rgba(255,255,255,${alpha})`;

      ctx.fillRect(
        0,
        0,
        width,
        height
      );
    }
  }

  // =====================================================
  // 13. MAIN ANIMATION LOOP
  // =====================================================

  function frame(timestamp) {
    const time = timestamp / 1000;

    const dt = lastTime
      ? Math.min(time - lastTime, 0.05)
      : 0;

    lastTime = time;

    if (width > 0 && height > 0) {
      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      nightMix = mix(
        nightMix,
        night ? 1 : 0,
        Math.min(1, dt * 2.3)
      );

      drawSky();
      drawRainbow();
      drawClouds(dt);
      drawWind(time, dt);
      drawRain(dt);
      drawFireflies(time, dt);
      drawLightning(time, dt);
    }

    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  // =====================================================
  // 14. CLEANUP AND PUBLIC API
  // =====================================================

  function destroy() {
    cancelAnimationFrame(raf);
    observer.disconnect();
    canvas.remove();
  }

  return {
    touch,
    setState,
    getState,
    resize,
    destroy,
    canvas
  };
}
