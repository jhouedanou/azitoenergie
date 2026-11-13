// Build Azito : puzzle chronométré (Canvas 2D), pièces à tenons « aimantées ».
import { addScore, renderBoard, formatTime } from './scores.js';
import { makeTimer } from './timer.js';
import { getPlayer } from './inscriptions.js';

const MAX_TIME = 20; // secondes pour finir le puzzle ; au-delà, la partie est perdue
const LOW_TIME = 5; // le chrono passe au rouge sur les 5 dernières secondes
const ROWS = 2;
const SNAP_MS = 480; // durée du flash quand une pièce s'aimante
const C = { indigo: '#313280', red: '#c20e1a', blue: '#4d85d0', gray2: '#d9d9d9', gray5: '#b1b1b0', white: '#ffffff' };

// Images du dossier images/centrale (versions optimisées dans assets/img).
const PUZZLES = [
  { id: 'lagune', label: 'Le site et la lagune', src: 'assets/img/site-lagune.jpg' },
  { id: 'aerienne', label: 'Vue aérienne', src: 'assets/img/centrale-aerienne.jpg' },
  { id: 'cheminees', label: 'Les cheminées', src: 'assets/img/cheminees-sol.jpg' },
  { id: 'cheminee', label: 'Au pied de la cheminée', src: 'assets/img/cheminee.jpg' },
  { id: 'unite', label: 'Une unité de production', src: 'assets/img/unite.jpg' },
];

const $ = (id) => document.getElementById(id);
const els = {
  picker: $('picker'), grid: $('grid'),
  build: $('build'), wrap: $('canvas-wrap'), canvas: $('canvas'), back: $('back'),
  progress: $('progress'), count: $('count'),
  result: $('result'), rTitle: $('result-title'), rTime: $('result-time'),
  rText: $('result-text'), rBoard: $('result-board'),
  again: $('again'), other: $('other'),
};
const ctx = els.canvas.getContext('2d');
const setTimer = makeTimer({ root: $('timer'), text: $('timer-text'), bar: $('timer-bar') }, MAX_TIME, LOW_TIME);

const cols = 4;     // 4 × 2 = 8 pièces
let current = null;   // puzzle choisi
let image = null;     // HTMLImageElement
let state = null;     // { W, H, bx, by, bw, bh, pw, ph, pieces, boardImg }
let drag = null;
let startTime = 0, elapsed = 0, playing = false, raf = 0;

// ---------- Sélecteur ----------
function buildPicker() {
  for (const p of PUZZLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = '';
    const span = document.createElement('span');
    span.textContent = p.label;
    btn.append(img, span);
    btn.addEventListener('click', () => choose(p));
    els.grid.append(btn);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function choose(p) {
  current = p;
  image = await loadImage(p.src);
  els.picker.hidden = true;
  els.build.hidden = false;
  startGame();
}

// ---------- Géométrie des pièces ----------
// Un côté de pièce, de O dans la direction d, tenon vers la normale n (s = +1 tenon, -1 mortaise, 0 bord droit).
function side(path, ox, oy, dx, dy, nx, ny, L, T, s) {
  const P = (u, v) => [ox + dx * u * L + nx * v * T * s, oy + dy * u * L + ny * v * T * s];
  if (s === 0) { path.lineTo(...P(1, 0)); return; }
  path.lineTo(...P(0.36, 0));
  path.bezierCurveTo(...P(0.43, 0), ...P(0.31, 0.24), ...P(0.5, 0.24));
  path.bezierCurveTo(...P(0.69, 0.24), ...P(0.57, 0), ...P(0.64, 0));
  path.lineTo(...P(1, 0));
}

function piecePath(w, h, s) {
  const T = Math.min(w, h);
  const path = new Path2D();
  path.moveTo(0, 0);
  side(path, 0, 0, 1, 0, 0, -1, w, T, s.top);
  side(path, w, 0, 0, 1, 1, 0, h, T, s.right);
  side(path, w, h, -1, 0, 0, 1, w, T, s.bottom);
  side(path, 0, h, 0, -1, -1, 0, h, T, s.left);
  path.closePath();
  return path;
}

function layout() {
  const W = els.wrap.clientWidth, H = els.wrap.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  els.canvas.width = Math.round(W * dpr);
  els.canvas.height = Math.round(H * dpr);
  const ratio = 16 / 9;
  const landscape = W / H > 1.15;
  let bw = landscape ? Math.min(W * 0.52, H * 0.8 * ratio) : Math.min(W * 0.94, H * 0.5 * ratio);
  bw = Math.floor(bw / cols) * cols;
  const bh = Math.floor(bw / ratio / ROWS) * ROWS;
  const bx = Math.round((W - bw) / 2);
  const by = landscape ? Math.round((H - bh) / 2) : Math.round(Math.min(16, H * 0.03));
  return { W, H, dpr, bx, by, bw, bh, pw: bw / cols, ph: bh / ROWS, landscape };
}

// Image recadrée (cover) aux dimensions du plateau.
function makeBoardImage(g) {
  const c = document.createElement('canvas');
  c.width = Math.round(g.bw * g.dpr);
  c.height = Math.round(g.bh * g.dpr);
  const x = c.getContext('2d');
  const scale = Math.max(c.width / image.naturalWidth, c.height / image.naturalHeight);
  const iw = image.naturalWidth * scale, ih = image.naturalHeight * scale;
  x.drawImage(image, (c.width - iw) / 2, (c.height - ih) / 2, iw, ih);
  return c;
}

function scatter(g, pieces) {
  const pad = g.pw * 0.2;
  const zones = g.landscape
    ? [
        { x: pad, y: pad, w: g.bx - g.pw - pad * 2.2, h: g.H - g.ph - pad * 2 },
        { x: g.bx + g.bw + pad * 1.2, y: pad, w: g.W - (g.bx + g.bw) - g.pw - pad * 2.2, h: g.H - g.ph - pad * 2 },
      ]
    : [{ x: pad, y: g.by + g.bh + pad * 1.5, w: g.W - g.pw - pad * 2, h: g.H - (g.by + g.bh) - g.ph - pad * 3 }];
  const order = [...pieces].sort(() => Math.random() - 0.5);
  order.forEach((p, i) => {
    const z = zones[i % zones.length];
    const slots = Math.ceil(order.length / zones.length);
    const k = Math.floor(i / zones.length);
    if (g.landscape) {
      // répartition verticale régulière + léger aléa, pour que toutes les pièces restent visibles
      // en quinconce : chaque pièce garde une zone saisissable même si elles se chevauchent
      const zw = Math.max(0, z.w);
      p.x = k % 2 ? z.x + zw - Math.random() * zw * 0.15 : z.x + Math.random() * zw * 0.15;
      p.y = z.y + (Math.max(0, z.h) * k) / Math.max(1, slots - 1) + (Math.random() - 0.5) * pad;
    } else {
      const perRow = Math.ceil(order.length / 2);
      p.x = z.x + (Math.max(0, z.w) * (i % perRow)) / Math.max(1, perRow - 1);
      p.y = z.y + (i < perRow ? 0 : Math.max(0, z.h)) + (Math.random() - 0.5) * pad;
    }
    p.x = Math.max(4, Math.min(g.W - g.pw - 4, p.x));
    p.y = Math.max(4, Math.min(g.H - g.ph - 4, p.y));
  });
}

function makePieces(g) {
  const hz = [], vt = [];
  for (let r = 0; r <= ROWS; r++) hz.push(Array.from({ length: cols }, () => (Math.random() < 0.5 ? 1 : -1)));
  for (let r = 0; r < ROWS; r++) vt.push(Array.from({ length: cols + 1 }, () => (Math.random() < 0.5 ? 1 : -1)));
  const pieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      const s = {
        top: r === 0 ? 0 : -hz[r][c],
        bottom: r === ROWS - 1 ? 0 : hz[r + 1][c],
        left: c === 0 ? 0 : -vt[r][c],
        right: c === cols - 1 ? 0 : vt[r][c + 1],
      };
      pieces.push({ r, c, s, x: 0, y: 0, locked: false, path: piecePath(g.pw, g.ph, s) });
    }
  }
  return pieces;
}

// ---------- Rendu ----------
function draw() {
  const g = state;
  ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  ctx.clearRect(0, 0, g.W, g.H);

  // Plateau blanc, sans image fantôme (trop facile sinon) : seuls les contours des pièces guident
  ctx.fillStyle = C.white;
  ctx.fillRect(g.bx, g.by, g.bw, g.bh);
  ctx.strokeStyle = C.gray5;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  for (const p of g.pieces) {
    ctx.save();
    ctx.translate(g.bx + p.c * g.pw, g.by + p.r * g.ph);
    ctx.stroke(p.path);
    ctx.restore();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(g.bx, g.by, g.bw, g.bh);

  const paint = (p, lifted) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (lifted) {
      ctx.shadowColor = 'rgb(0 0 0 / 0.5)';
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = C.white;
      ctx.fill(p.path);
      ctx.shadowColor = 'transparent';
    }
    ctx.save();
    ctx.clip(p.path);
    ctx.drawImage(g.boardImg, -p.c * g.pw, -p.r * g.ph, g.bw, g.bh);
    ctx.restore();
    // Flash d'aimantation : voile blanc qui s'efface + contour épais
    const snap = p.locked && p.snapAt ? 1 - (performance.now() - p.snapAt) / SNAP_MS : 0;
    if (snap > 0) {
      ctx.fillStyle = `rgb(255 255 255 / ${0.75 * snap})`;
      ctx.fill(p.path);
    }
    ctx.lineWidth = snap > 0 ? 1 + 5 * snap : p.locked ? 1 : 2;
    ctx.strokeStyle = p.locked && snap <= 0 ? 'rgb(255 255 255 / 0.55)' : C.white;
    ctx.stroke(p.path);
    ctx.restore();
  };

  for (const p of g.pieces) if (p.locked) paint(p, false);
  for (const p of g.pieces) if (!p.locked && p !== drag?.piece) paint(p, false);
  if (drag) paint(drag.piece, true);
}

// Après la fin de partie, on continue de dessiner le temps du dernier flash.
function settle() {
  const until = performance.now() + SNAP_MS;
  const step = () => {
    draw();
    if (performance.now() < until) raf = requestAnimationFrame(step);
  };
  step();
}

// ---------- Partie ----------
function startGame() {
  cancelAnimationFrame(raf);
  els.result.hidden = true;
  const g = layout();
  g.boardImg = makeBoardImage(g);
  g.pieces = makePieces(g);
  scatter(g, g.pieces);
  state = g;
  drag = null;
  elapsed = 0;
  playing = true;
  startTime = performance.now();
  updateHud();
  loop();
}

function updateHud() {
  const done = state.pieces.filter((p) => p.locked).length;
  els.count.firstChild.textContent = `${done} / ${state.pieces.length} `;
  els.progress.style.width = `${(done / state.pieces.length) * 100}%`; // la barre suit les pièces, l'anneau suit le temps
  setTimer(MAX_TIME - elapsed);
}

function loop() {
  if (!playing) return;
  elapsed = (performance.now() - startTime) / 1000;
  if (elapsed >= MAX_TIME) { elapsed = MAX_TIME; return end(false); }
  updateHud();
  draw();
  raf = requestAnimationFrame(loop);
}

function end(won) {
  playing = false;
  drag = null;
  cancelAnimationFrame(raf);
  // temps mesuré à l'instant exact de la fin, indépendamment du rythme d'affichage
  elapsed = Math.min(MAX_TIME, (performance.now() - startTime) / 1000);
  updateHud();
  settle();
  els.rBoard.replaceChildren();
  els.result.classList.toggle('is-lost', !won);
  if (won) {
    els.rTitle.innerHTML = 'Centrale reconstituée <em>en</em>';
    els.rTime.hidden = false;
    els.rTime.textContent = formatTime(elapsed);
    els.rText.innerHTML = '<strong>Montre cet écran à l’animateur pour récupérer ton cadeau.</strong> Ton temps est inscrit au classement du jour.';
    // Le prénom vient de l'inscription : le temps entre au classement sans nouvelle saisie.
    const entry = addScore(getPlayer()?.prenom, elapsed, current.id);
    renderBoard(els.rBoard, { limit: 5, highlightId: entry.id });
  } else {
    els.rTitle.innerHTML = 'Perdu ! <em>Le temps est écoulé</em>';
    els.rTime.hidden = true;
    const done = state.pieces.filter((p) => p.locked).length;
    els.rText.textContent = `${done} pièce${done > 1 ? 's' : ''} sur ${state.pieces.length} en place en ${MAX_TIME} secondes. Réessaie, maintenant tu connais l’image.`;
  }
  setTimeout(() => { els.result.hidden = false; }, won ? 700 : 200);
}

// ---------- Glisser-déposer ----------
function pointerPos(e) {
  const r = els.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hit(x, y) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); // test en px CSS, chemins en repère local
  const loose = state.pieces.filter((p) => !p.locked);
  for (let i = loose.length - 1; i >= 0; i--) {
    const p = loose[i];
    if (ctx.isPointInPath(p.path, x - p.x, y - p.y)) return p;
  }
  return null;
}

els.canvas.addEventListener('pointerdown', (e) => {
  if (!playing || drag) return;
  const { x, y } = pointerPos(e);
  const p = hit(x, y);
  if (!p) return;
  // la pièce saisie passe au-dessus
  state.pieces.splice(state.pieces.indexOf(p), 1);
  state.pieces.push(p);
  drag = { piece: p, dx: x - p.x, dy: y - p.y, id: e.pointerId };
  try { els.canvas.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ }
});

els.canvas.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const { x, y } = pointerPos(e);
  const g = state, p = drag.piece;
  p.x = Math.max(-g.pw * 0.4, Math.min(g.W - g.pw * 0.6, x - drag.dx));
  p.y = Math.max(-g.ph * 0.4, Math.min(g.H - g.ph * 0.6, y - drag.dy));
});

function drop(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const g = state, p = drag.piece;
  const tx = g.bx + p.c * g.pw, ty = g.by + p.r * g.ph;
  if (Math.hypot(p.x - tx, p.y - ty) < Math.min(g.pw, g.ph) * 0.32) {
    p.x = tx; p.y = ty; p.locked = true; p.snapAt = performance.now(); // aimantation
  }
  drag = null;
  updateHud();
  if (playing && g.pieces.every((q) => q.locked)) end(true);
}
els.canvas.addEventListener('pointerup', drop);
els.canvas.addEventListener('pointercancel', drop);

// Redimensionnement / rotation : on recalcule le plateau en conservant l'avancement.
let resizeTimer = 0;
new ResizeObserver(() => {
  if (!state || els.build.hidden) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const old = state;
    const g = layout();
    if (g.W === old.W && g.H === old.H) return;
    g.boardImg = makeBoardImage(g);
    g.pieces = old.pieces.map((p) => ({ ...p, path: piecePath(g.pw, g.ph, p.s) }));
    const loose = g.pieces.filter((p) => !p.locked);
    scatter(g, loose);
    g.pieces.forEach((p) => { if (p.locked) { p.x = g.bx + p.c * g.pw; p.y = g.by + p.r * g.ph; } });
    state = g;
    drag = null;
    draw();
  }, 120);
}).observe(els.wrap);

function toPicker() {
  playing = false;
  cancelAnimationFrame(raf);
  els.result.hidden = true;
  els.build.hidden = true;
  els.picker.hidden = false;
  setTimer(MAX_TIME);
}
els.back.addEventListener('click', toPicker);
els.other.addEventListener('click', toPicker);
els.again.addEventListener('click', startGame);

buildPicker();
setTimer(MAX_TIME);

// Aide aux tests : ?debug expose l'état du puzzle (lecture seule côté jeu).
if (new URLSearchParams(location.search).has('debug')) window.__azitoPuzzle = () => state;
