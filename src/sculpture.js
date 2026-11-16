import { controls, contours } from './logo.mjs';

function outline(points) {
  return points.flatMap((_, i) => {
    const [a, b, c, d] = controls(points, i);
    return [0, 0.25, 0.5, 0.75].map(t => {
      const u = 1 - t;
      return a.map((value, axis) => u ** 3 * value + 3 * u ** 2 * t * b[axis] + 3 * u * t ** 2 * c[axis] + t ** 3 * d[axis]);
    });
  });
}

const pieces = contours.map((points, index) => {
  const perimeter = outline(points);
  const center = [0, 1].map(axis => perimeter.reduce((sum, p) => sum + p[axis], 0) / perimeter.length);
  const depth = index === 0 ? 0.115 : 0.17;
  const levels = [[0.91, -depth], [1, -depth + 0.028], [1, depth - 0.035], [0.91, depth]];
  const rings = levels.map(([scale, z]) => perimeter.map(([x, y]) => [center[0] + (x - center[0]) * scale, center[1] + (y - center[1]) * scale, z]));
  return { center, rings, index };
});

const palettes = [
  ['#0e226c', '#14328d', '#1e44ad', '#2a57cb', '#4073ec', '#5688f9', '#799eff'],
  ['#2651cc', '#3366e4', '#4d7bf5', '#628fff', '#7da3ff', '#91b1ff', '#aec5ff'],
  ['#bccdff', '#c9d8ff', '#d2ddff', '#dde6ff', '#e4ebff', '#edf2ff', '#fafbff'],
];

const restX = -0.21;
const restY = -0.38;
const introDuration = 1.2;

export function mountSculpture(panel, motion) {
  const canvas = panel.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const toggle = panel.querySelector('[data-motion]');
  const stage = panel.querySelector('.model-stage');
  let w = 0, h = 0, raf = 0, last = 0;
  let time = motion.matches ? introDuration : 0;
  let ax = restX, ay = restY, targetX = restX, targetY = restY;
  let hoverX = 0, hoverY = 0, pointer = null;
  let active = false, paused = motion.matches, userMotionChoice = false;

  function frame(now) {
    raf = 0;
    if (!active || document.hidden || !w || !h) return;
    const x = targetX + hoverX;
    const y = targetY + hoverY;
    if (!last || now - last >= 24) {
      if (!paused && !pointer) time += last ? Math.min(now - last, 50) * 0.001 : 0.016;
      last = now;
      const ease = motion.matches ? 1 : 0.24;
      ax += (x - ax) * ease;
      ay += (y - ay) * ease;
      paint();
    }
    if (!paused || Math.abs(ax - x) + Math.abs(ay - y) > 0.002) schedule();
    else last = 0;
  }

  function schedule() {
    if (active && !document.hidden && !raf) raf = requestAnimationFrame(frame);
  }

  function paint() {
    const size = Math.min(w, h);
    const ox = w * 0.5;
    const oy = h * 0.49;
    const scale = size * 0.385;
    const tilt = Math.min(1, time / 0.65);
    const x = (ax + Math.sin(time * 0.93) * 0.12) * tilt;
    const y = (ay + Math.sin(time * 0.79 - 0.22) * 0.22) * tilt;
    const z = -0.09 + Math.sin(time * 0.67) * 0.09;
    const sinX = Math.sin(x), cosX = Math.cos(x);
    const sinY = Math.sin(y), cosY = Math.cos(y);
    const sinZ = Math.sin(z), cosZ = Math.cos(z);

    function rotate([x, y, z]) {
      const rx = x * cosZ - y * sinZ;
      const ry = y * cosZ + x * sinZ;
      const tx = rx * cosY + z * sinY;
      const tz = z * cosY - rx * sinY;
      return [tx, ry * cosX - tz * sinX, tz * cosX + ry * sinX];
    }

    function project([x, y, z]) {
      const perspective = scale * 5 / (5 - z);
      return [ox + x * perspective, oy - y * perspective];
    }

    ctx.clearRect(0, 0, w, h);

    const faces = [];
    function addFace(vertices, normal, palette) {
      if (normal[2] < -0.02) return;
      const shade = Math.min(6, Math.max(0, Math.round((normal[0] * -0.43 + normal[1] * 0.55 + normal[2] * 0.72) * 4 + 2)));
      const depth = vertices.reduce((sum, v) => sum + v[2], 0) / vertices.length;
      faces.push({ points: vertices.map(project), depth, color: palettes[palette][shade] });
    }

    for (const { rings, center, index } of pieces) {
      // Lift the flat emblem into relief one piece at a time.
      const progress = Math.max(0, Math.min(1, (time - index * 0.037) / 0.8));
      const thickness = 0.07 + 0.93 * (1 - (1 - progress) ** 3);
      const lift = Math.sin(Math.PI * progress) * 0.24;
      const rotated = rings.map(ring => ring.map(([x, y, z]) => rotate([
        x + center[0] * lift * 0.2,
        y + center[1] * lift * 0.2,
        z * thickness + lift,
      ])));
      const lastRing = rings.length - 1;
      addFace(rotated[0], rotate([0, 0, -1]), 0);
      addFace(rotated[lastRing], rotate([0, 0, 1]), index === 0 ? 2 : 1);
      for (let level = 0; level < lastRing; level++) {
        const ring = rings[level];
        for (let i = 0; i < ring.length; i++) {
          const j = (i + 1) % ring.length;
          const dx = ring[j][0] - ring[i][0];
          const dy = ring[j][1] - ring[i][1];
          const length = Math.hypot(dx, dy);
          if (!length) continue;
          const bevel = level === 1 ? 0 : (level === 0 ? -0.58 : 0.77);
          addFace([rotated[level][i], rotated[level][j], rotated[level + 1][j], rotated[level + 1][i]], rotate([-dy / length, dx / length, bevel]), level === 2 ? 1 : 0);
        }
      }
    }

    faces.sort((a, b) => a.depth - b.depth);
    for (const { points, color } of faces) {
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
      ctx.closePath();
      ctx.fillStyle = ctx.strokeStyle = color;
      ctx.lineWidth = 0.85;
      ctx.stroke();
      ctx.fill();
    }
  }

  function resize() {
    w = stage.clientWidth;
    h = stage.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (w && h) paint();
  }

  function showMotionState() {
    toggle.toggleAttribute('data-paused', paused);
    toggle.setAttribute('aria-label', paused ? 'Play emblem animation' : 'Pause emblem animation');
  }

  toggle.addEventListener('click', () => {
    userMotionChoice = true;
    paused = !paused;
    showMotionState();
    schedule();
  });
  motion.addEventListener('change', () => {
    if (!userMotionChoice) {
      paused = motion.matches;
      if (paused) time = Math.max(time, introDuration);
    }
    showMotionState();
    schedule();
  });

  canvas.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    targetX += hoverX;
    targetY += hoverY;
    hoverX = hoverY = 0;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', event => {
    if (pointer?.id === event.pointerId) {
      targetY += (event.clientX - pointer.x) * 0.013;
      targetX += (event.clientY - pointer.y) * 0.013;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    } else if (event.pointerType === 'mouse' && !paused && !motion.matches) {
      const box = canvas.getBoundingClientRect();
      hoverX = (event.clientY - box.top - h / 2) / h * 0.62;
      hoverY = (event.clientX - box.left - w / 2) / w * 0.9;
    } else return;
    schedule();
  });
  canvas.addEventListener('pointerleave', () => {
    hoverX = hoverY = 0;
    schedule();
  });
  canvas.addEventListener('lostpointercapture', () => {
    pointer = null;
    canvas.classList.remove('dragging');
  });
  canvas.addEventListener('keydown', event => {
    const turns = { ArrowLeft: [0, -0.24], ArrowRight: [0, 0.24], ArrowUp: [-0.24, 0], ArrowDown: [0.24, 0] };
    if (event.key === 'Home') {
      targetX = restX;
      targetY = restY;
      time = paused || motion.matches ? introDuration : 0;
    } else if (turns[event.key]) {
      targetX += turns[event.key][0];
      targetY += turns[event.key][1];
    } else return;
    event.preventDefault();
    schedule();
  });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active) schedule();
    else last = 0;
  }).observe(panel);
  document.addEventListener('visibilitychange', schedule);
  resize();
  canvas.hidden = false;
  panel.querySelector('.model-fallback').hidden = true;
  toggle.hidden = false;
  showMotionState();
  schedule();
}
