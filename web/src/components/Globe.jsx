import { useEffect, useId, useRef } from 'react';
import { LAND_MASK } from '../assets/land-mask.js';

/*
  Глобус NNATO — точечная (dot-matrix) сфера на Canvas 2D, без WebGL-библиотек.
  Плакатная подача: плоская заливка диска, суша — квадратные точки в 4 тонах
  (освещение квантуется, а не растягивается градиентом), сетка 30° линиями 1px,
  пунктирный кобальтовый маршрут Казахстан → США с квадратными маркерами, как в Art.jsx.
  Цвета берутся из CSS-токенов, поэтому светлая и тёмная темы работают сами.

  Поведение: медленное вращение; наклон за курсором; перетаскивание с инерцией;
  стрелки на клавиатуре. Цикл анимации останавливается, когда глобус вне экрана,
  вкладка скрыта или вращение на паузе. prefers-reduced-motion — без автоповорота,
  без наклона и без бегущего пунктира. На телефонах — реже точки, 30 кадров/с, DPR ≤ 1.5.
*/

const DEG = Math.PI / 180;
const AUTO_SPEED = 0.045; // рад/с — полный оборот примерно за 2,3 минуты
const PITCH_DEFAULT = 0.42; // взгляд немного с севера, чтобы дуга маршрута была видна
const PITCH_MIN = -0.25;
const PITCH_MAX = 1.1;
const LIGHT = normalize([-0.5, 0.55, 0.68]);
const TONES = [0.2, 0.3, 0.41, 0.52]; // доля цвета текста в точке: тень → свет
const STOPS = [0.2, 0.4, 0.6, 0.8]; // этапы маршрута 01–04 (как на схеме «Путь участника»)

export const ROUTE = {
  from: { lat: 43.24, lon: 76.95, label: 'КАЗАХСТАН' },
  to: { lat: 40.71, lon: -74.01, label: 'США' },
};
const YAW_DEFAULT = -60 * DEG; // стартовый вид: Казахстан чуть правее центра

function normalize([x, y, z]) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

function toVec(lat, lon) {
  const c = Math.cos(lat * DEG);
  return [c * Math.sin(lon * DEG), Math.sin(lat * DEG), c * Math.cos(lon * DEG)];
}

let maskBits = null;
function landAt(lat, lon) {
  if (!maskBits) {
    const bin = atob(LAND_MASK.data);
    maskBits = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) maskBits[i] = bin.charCodeAt(i);
  }
  const row = Math.min(LAND_MASK.height - 1, Math.max(0, Math.floor(90 - lat)));
  const col = ((Math.floor(lon + 180) % 360) + 360) % 360;
  const bit = row * LAND_MASK.width + col;
  return (maskBits[bit >> 3] >> (bit & 7)) & 1;
}

/** Точки суши на равномерной сетке с шагом step° (сдвиг через ряд — «соты»). */
function buildDots(step) {
  const out = [];
  let r = 0;
  for (let lat = -90 + step / 2; lat < 90; lat += step, r++) {
    const n = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / step));
    const shift = r % 2 ? 0.5 : 0;
    for (let i = 0; i < n; i++) {
      const lon = -180 + ((i + shift) * 360) / n;
      if (!landAt(lat, lon)) continue;
      out.push(Math.cos(lat * DEG), Math.sin(lat * DEG), Math.cos(lon * DEG), Math.sin(lon * DEG));
    }
  }
  return new Float32Array(out);
}

/** Дуга большого круга, приподнятая над поверхностью. */
function buildRoute(segments = 120) {
  const a = toVec(ROUTE.from.lat, ROUTE.from.lon);
  const b = toVec(ROUTE.to.lat, ROUTE.to.lon);
  const omega = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const k1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const k2 = Math.sin(t * omega) / Math.sin(omega);
    const h = 1 + 0.17 * Math.sin(Math.PI * t);
    pts.push([(k1 * a[0] + k2 * b[0]) * h, (k1 * a[1] + k2 * b[1]) * h, (k1 * a[2] + k2 * b[2]) * h]);
  }
  return pts;
}

function buildGraticule() {
  const lines = [];
  for (let lon = -180; lon < 180; lon += 30) {
    const l = [];
    for (let lat = -90; lat <= 90; lat += 3) l.push(toVec(lat, lon));
    lines.push(l);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const l = [];
    for (let lon = -180; lon <= 180; lon += 3) l.push(toVec(lat, lon));
    lines.push(l);
  }
  return lines;
}

function parseColor(value, fallback) {
  const v = (value || '').trim();
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (a, b, t) => `rgb(${a.map((c, i) => Math.round(c * t + b[i] * (1 - t))).join(' ')})`;
const rgb = (c) => `rgb(${c.join(' ')})`;

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const text = parseColor(cs.getPropertyValue('--text'), [20, 20, 20]);
  const bg = parseColor(cs.getPropertyValue('--bg'), [227, 226, 222]);
  const muted = parseColor(cs.getPropertyValue('--surface-muted'), [218, 217, 212]);
  const border = parseColor(cs.getPropertyValue('--border'), [199, 199, 199]);
  const accent = parseColor(cs.getPropertyValue('--accent'), [19, 81, 170]);
  return {
    text: rgb(text),
    bg: rgb(bg),
    disc: rgb(muted),
    line: rgb(border),
    accent: rgb(accent),
    tones: TONES.map((t) => mix(text, muted, t)),
  };
}

/**
 * Размер и положение глобуса. На широком экране — крупно по центру, текст лежит поверх.
 * На узком — вписываем между верхней строкой и блоком заголовка (top/bottom — их границы
 * в координатах сцены), чтобы глобус не уходил под текст.
 */
function layout(w, h, top, bottom) {
  if (w >= 960) {
    const R = Math.min(h * 0.4, w * 0.29);
    return { R, cx: w / 2, cy: h * 0.47 };
  }
  const avail = Math.max(0, bottom - top);
  const R = Math.max(Math.min(w, h) * 0.2, Math.min(w * 0.4, avail * 0.42));
  return { R, cx: w / 2, cy: avail > 0 ? top + avail / 2 : h * 0.36 };
}

export default function Globe({ paused = false, className = '' }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const kickRef = useRef(() => {});
  const hintId = useId();

  useEffect(() => {
    pausedRef.current = paused;
    kickRef.current();
  }, [paused]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!wrap || !ctx) return undefined;

    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mqDark = window.matchMedia('(prefers-color-scheme: dark)');

    const scope = wrap.closest('[data-globe-scope]') || wrap;
    let palette = readPalette();
    let lite = false; // упрощённый режим для телефонов и слабых устройств
    let dots = null;
    const route = buildRoute();
    const graticule = buildGraticule();
    const marks = [ROUTE.from, ROUTE.to].map((p) => ({ ...p, v: toVec(p.lat, p.lon) }));

    let W = 0;
    let H = 0;
    let dpr = 1;
    let geo = { R: 1, cx: 0, cy: 0 };

    const s = {
      yaw: YAW_DEFAULT,
      pitch: PITCH_DEFAULT,
      yawVel: 0,
      pitchVel: 0,
      tiltX: 0,
      tiltY: 0,
      targetX: 0,
      targetY: 0,
      dash: 0,
      drag: null,
      focused: false,
      inView: true,
    };

    let raf = 0;
    let last = 0;
    let lastDraw = 0;

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const nextLite =
        rect.width < 720 || window.matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
      if (!dots || nextLite !== lite) {
        lite = nextLite;
        dots = buildDots(lite ? 2.4 : 1.35);
      }
      dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const topEl = scope.querySelector('[data-globe-top]');
      const bottomEl = scope.querySelector('[data-globe-bottom]');
      const top = topEl ? topEl.getBoundingClientRect().bottom - rect.top : 0;
      const bottom = bottomEl ? bottomEl.getBoundingClientRect().top - rect.top : H;
      geo = layout(W, H, top, bottom);
      draw();
    }

    // Поворот: сначала вокруг вертикальной оси (долгота), затем наклон к зрителю.
    function view() {
      const yaw = s.yaw + s.tiltX * 0.28;
      const pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, s.pitch + s.tiltY * 0.14));
      return { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch) };
    }
    function project([x, y, z], v) {
      const x1 = x * v.cy + z * v.sy;
      const z1 = z * v.cy - x * v.sy;
      return [x1, y * v.cp - z1 * v.sp, y * v.sp + z1 * v.cp];
    }

    function draw() {
      const { R, cx, cy } = geo;
      const v = view();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Внешнее кольцо с делениями — «приборная» деталь, неподвижна.
      ctx.strokeStyle = s.focused ? palette.accent : palette.line;
      ctx.lineWidth = s.focused ? 2 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = palette.line;
      ctx.beginPath();
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const len = i % 6 === 0 ? R * 0.045 : R * 0.018;
        const r0 = R * 1.12;
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      }
      ctx.stroke();

      // Диск — плоская заливка, контур 1px.
      ctx.fillStyle = palette.disc;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.line;
      ctx.stroke();

      // Сетка 30°: только видимая полусфера.
      ctx.beginPath();
      for (const line of graticule) {
        let pen = false;
        for (const p of line) {
          const q = project(p, v);
          if (q[2] > 0) {
            const X = cx + q[0] * R;
            const Y = cy - q[1] * R;
            if (pen) ctx.lineTo(X, Y);
            else ctx.moveTo(X, Y);
            pen = true;
          } else pen = false;
        }
      }
      ctx.stroke();

      // Суша: квадратные точки, свет квантуется в 4 тона.
      const base = Math.max(1.1, R * (lite ? 0.0125 : 0.0088));
      const buckets = [[], [], [], []];
      const d = dots;
      for (let i = 0; i < d.length; i += 4) {
        const cl = d[i];
        const sl = d[i + 1];
        const x = cl * d[i + 3];
        const z = cl * d[i + 2];
        const x1 = x * v.cy + z * v.sy;
        const z1 = z * v.cy - x * v.sy;
        const zz = sl * v.sp + z1 * v.cp;
        if (zz <= 0.02) continue;
        const yy = sl * v.cp - z1 * v.sp;
        const lit = x1 * LIGHT[0] + yy * LIGHT[1] + zz * LIGHT[2];
        const b = lit > 0.62 ? 3 : lit > 0.3 ? 2 : lit > -0.05 ? 1 : 0;
        const size = base * (0.62 + 0.13 * b) * (0.45 + 0.55 * Math.sqrt(zz));
        buckets[b].push(cx + x1 * R - size / 2, cy - yy * R - size / 2, size);
      }
      for (let b = 0; b < 4; b++) {
        const arr = buckets[b];
        if (!arr.length) continue;
        ctx.fillStyle = palette.tones[b];
        ctx.beginPath();
        for (let i = 0; i < arr.length; i += 3) ctx.rect(arr[i], arr[i + 1], arr[i + 2], arr[i + 2]);
        ctx.fill();
      }

      // Маршрут: пунктир кобальтом; сегменты за глобусом скрыты.
      const proj = route.map((p) => project(p, v));
      const visible = (q) => q[2] > 0 || q[0] * q[0] + q[1] * q[1] > 1;
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = Math.max(1.5, R * 0.006);
      ctx.setLineDash([R * 0.032, R * 0.026]);
      ctx.lineDashOffset = -s.dash * R;
      ctx.beginPath();
      let pen = false;
      for (const q of proj) {
        if (visible(q)) {
          const X = cx + q[0] * R;
          const Y = cy - q[1] * R;
          if (pen) ctx.lineTo(X, Y);
          else ctx.moveTo(X, Y);
          pen = true;
        } else pen = false;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Этапы 01–04 на дуге.
      const chip = Math.max(14, R * 0.055);
      ctx.font = `700 ${Math.round(chip * 0.55)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      STOPS.forEach((t, i) => {
        const q = proj[Math.round(t * (proj.length - 1))];
        if (!visible(q)) return;
        const X = cx + q[0] * R;
        const Y = cy - q[1] * R;
        ctx.fillStyle = palette.text;
        ctx.fillRect(X - chip / 2, Y - chip / 2, chip, chip);
        ctx.fillStyle = palette.bg;
        ctx.fillText(String(i + 1).padStart(2, '0'), X, Y + 0.5);
      });

      // Маркеры городов: квадрат в рамке (как на схеме маршрута) и подпись.
      const m = Math.max(6, R * 0.024);
      ctx.font = `700 ${Math.max(10, Math.round(R * 0.036))}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'left';
      for (const mark of marks) {
        const q = project(mark.v, v);
        if (q[2] <= 0) continue;
        const X = cx + q[0] * R;
        const Y = cy - q[1] * R;
        ctx.fillStyle = palette.text;
        ctx.fillRect(X - m / 2, Y - m / 2, m, m);
        ctx.strokeStyle = palette.text;
        ctx.lineWidth = 1;
        ctx.strokeRect(X - m * 1.15, Y - m * 1.15, m * 2.3, m * 2.3);
        const tw = ctx.measureText(mark.label).width;
        const pad = m * 0.7;
        const lx = X + m * 1.6;
        ctx.fillStyle = palette.bg;
        ctx.fillRect(lx, Y - m * 1.15, tw + pad * 2, m * 2.3);
        ctx.strokeRect(lx, Y - m * 1.15, tw + pad * 2, m * 2.3);
        ctx.fillStyle = palette.text;
        ctx.fillText(mark.label, lx + pad, Y + 0.5);
      }
    }

    const reduced = () => mqReduce.matches;
    const animating = () =>
      (!pausedRef.current && !reduced()) ||
      s.drag ||
      Math.abs(s.yawVel) > 0.002 ||
      Math.abs(s.pitchVel) > 0.002 ||
      Math.abs(s.targetX - s.tiltX) > 0.001 ||
      Math.abs(s.targetY - s.tiltY) > 0.001;

    function frame(now) {
      raf = 0;
      if (!s.inView || document.hidden) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      const running = !pausedRef.current && !reduced();
      if (running && !s.drag) {
        s.yaw += AUTO_SPEED * dt;
        s.dash += dt * 0.05;
      }
      if (!s.drag) {
        s.yaw += s.yawVel * dt;
        s.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, s.pitch + s.pitchVel * dt));
        const decay = Math.exp(-dt * 3.2);
        s.yawVel *= decay;
        s.pitchVel *= decay;
      }
      const ease = 1 - Math.exp(-dt * 3.5); // мягкий наклон сцены
      s.tiltX += (s.targetX - s.tiltX) * ease;
      s.tiltY += (s.targetY - s.tiltY) * ease;

      // На телефоне — не чаще 30 кадров/с.
      if (!lite || now - lastDraw > 32 || s.drag) {
        draw();
        lastDraw = now;
      }
      if (animating()) raf = requestAnimationFrame(frame);
      else last = 0;
    }
    function kick() {
      if (!raf && s.inView && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    }
    kickRef.current = () => {
      draw();
      kick();
    };

    // Наклон за курсором — только мышь/тачпад, не при reduced motion.
    function onMove(e) {
      if (e.pointerType !== 'mouse' || s.drag) return;
      const c = canvas.getBoundingClientRect();
      const ox = e.clientX - c.left - geo.cx;
      const oy = e.clientY - c.top - geo.cy;
      canvas.style.cursor = e.target === canvas && ox * ox + oy * oy <= (geo.R * 1.15) ** 2 ? 'grab' : '';
      if (!mqFine.matches || reduced()) return;
      const r = scope.getBoundingClientRect();
      s.targetX = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      s.targetY = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    }
    function onLeave() {
      s.targetX = 0;
      s.targetY = 0;
      kick();
    }

    // Перетаскивание: только внутри глобуса, чтобы не мешать выделению текста.
    function onDown(e) {
      if (e.button !== 0) return;
      const r = canvas.getBoundingClientRect();
      const dx = e.clientX - r.left - geo.cx;
      const dy = e.clientY - r.top - geo.cy;
      if (dx * dx + dy * dy > (geo.R * 1.15) ** 2) return;
      s.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), vx: 0, vy: 0, touch: e.pointerType !== 'mouse' };
      s.yawVel = 0;
      s.pitchVel = 0;
      canvas.setPointerCapture(e.pointerId);
      wrap.classList.add('is-dragging');
      kick();
    }
    function onDrag(e) {
      const g = s.drag;
      if (!g || g.id !== e.pointerId) return;
      const now = performance.now();
      const dt = Math.max(1, now - g.t) / 1000;
      const ax = (e.clientX - g.x) / geo.R;
      const ay = g.touch ? 0 : (e.clientY - g.y) / geo.R;
      s.yaw += ax;
      s.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, s.pitch + ay));
      g.vx = g.vx * 0.6 + (ax / dt) * 0.4;
      g.vy = g.vy * 0.6 + (ay / dt) * 0.4;
      g.x = e.clientX;
      g.y = e.clientY;
      g.t = now;
      draw();
    }
    function onUp(e) {
      const g = s.drag;
      if (!g || g.id !== e.pointerId) return;
      if (!reduced() && performance.now() - g.t < 80) {
        s.yawVel = Math.max(-3, Math.min(3, g.vx));
        s.pitchVel = Math.max(-2, Math.min(2, g.vy));
      }
      s.drag = null;
      wrap.classList.remove('is-dragging');
      kick();
    }

    // Клавиатура: стрелки — поворот, Home — исходный вид.
    function onKey(e) {
      const stepYaw = 12 * DEG;
      const stepPitch = 8 * DEG;
      if (e.key === 'ArrowLeft') s.yaw -= stepYaw;
      else if (e.key === 'ArrowRight') s.yaw += stepYaw;
      else if (e.key === 'ArrowUp') s.pitch = Math.max(PITCH_MIN, s.pitch - stepPitch);
      else if (e.key === 'ArrowDown') s.pitch = Math.min(PITCH_MAX, s.pitch + stepPitch);
      else if (e.key === 'Home') {
        s.yaw = YAW_DEFAULT;
        s.pitch = PITCH_DEFAULT;
      } else return;
      e.preventDefault();
      s.yawVel = 0;
      s.pitchVel = 0;
      draw();
    }
    const onFocus = () => {
      let visible = true;
      try { visible = wrap.matches(':focus-visible'); } catch { /* старый браузер — показываем кольцо */ }
      s.focused = visible;
      draw();
    };
    const onBlur = () => { s.focused = false; draw(); };

    const onScheme = () => {
      palette = readPalette();
      draw();
    };
    const onVisibility = () => (document.hidden ? null : kick());
    const onReduce = () => kickRef.current();

    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    // Высота заголовка меняется после загрузки шрифта — пересчитать место под глобус.
    scope.querySelectorAll('[data-globe-top], [data-globe-bottom]').forEach((el) => ro.observe(el));
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          s.inView = entry.isIntersecting;
          if (s.inView) kick();
        })
      : null;
    io?.observe(wrap);

    scope.addEventListener('pointermove', onMove);
    scope.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onDrag);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    wrap.addEventListener('keydown', onKey);
    wrap.addEventListener('focus', onFocus);
    wrap.addEventListener('blur', onBlur);
    mqDark.addEventListener?.('change', onScheme);
    mqReduce.addEventListener?.('change', onReduce);
    document.addEventListener('visibilitychange', onVisibility);
    // Подписи рисуются JetBrains Mono — перерисовать, когда шрифт загрузится.
    document.fonts?.ready.then(() => draw()).catch(() => {});

    resize();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io?.disconnect();
      scope.removeEventListener('pointermove', onMove);
      scope.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onDrag);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('keydown', onKey);
      wrap.removeEventListener('focus', onFocus);
      wrap.removeEventListener('blur', onBlur);
      mqDark.removeEventListener?.('change', onScheme);
      mqReduce.removeEventListener?.('change', onReduce);
      document.removeEventListener('visibilitychange', onVisibility);
      kickRef.current = () => {};
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`globe ${className}`}
      tabIndex={0}
      role="group"
      aria-roledescription="интерактивный глобус"
      aria-label="Глобус с маршрутом из Казахстана в США"
      aria-describedby={hintId}
    >
      <canvas ref={canvasRef} className="globe__canvas" aria-hidden="true" />
      <p id={hintId} className="globe__hint">
        <span aria-hidden="true">← → ↑ ↓</span> повернуть · <span aria-hidden="true">Home</span>
        <span className="visually-hidden">Клавиша Home</span> — исходный вид
      </p>
    </div>
  );
}
