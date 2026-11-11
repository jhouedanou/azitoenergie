// Turbine Match — observer une turbine, trouver le seul schéma identique parmi A / B / C.
// 4 turbines (recréations three.js des visuels du dossier images/turbine) × 3 niveaux de difficulté.
import { mountViewer, renderSchemas, webglAvailable, VARIANTS } from './turbine-model.js';

const DURATION = 30;
const LETTERS = ['A', 'B', 'C'];
const LEVELS = ['Niveau 1', 'Niveau 2', 'Niveau 3'];

// Chaque mutation = une seule différence avec la turbine observée.
const M = {
  // Niveau 1 — différences franches
  turbine3: { cfg: { turbineStages: 3 }, part: 'turbine', text: 'il manque deux étages d’aubes à la turbine' },
  compHalf: { cfg: { compSkip: [8, 9, 10, 11, 12, 13] }, part: 'compressor', text: 'le compresseur a perdu toute une série d’étages' },
  noBell: { cfg: { bell: false }, part: 'inlet', text: 'le pavillon d’admission d’air a disparu' },
  supportFar: { cfg: { supportX: -0.9 }, part: 'support', text: 'le support avant a été déplacé vers le centre de la machine' },
  fewBurners: { cfg: { burners: 1 }, part: 'burners', text: 'il ne reste qu’un seul brûleur sur la chambre de combustion' },
  // Niveau 2 — orientations
  turbineFlip: { cfg: { turbineFlip: true }, part: 'turbine', text: 'les étages de la turbine sont montés à l’envers, du plus grand au plus petit' },
  couplingRight: { cfg: { coupling: 'right' }, part: 'coupling', text: 'la bride d’accouplement est passée à l’autre bout de l’arbre' },
  burnerTilt: { cfg: { burnerTilt: -1 }, part: 'burners', text: 'les brûleurs sont inclinés dans l’autre sens' },
  pipeDir: { cfg: { pipeDir: -1 }, part: 'pipe', text: 'la conduite de prélèvement part dans l’autre sens' },
  // Niveau 3 — détails
  turbine4: { cfg: { turbineStages: 4 }, part: 'turbine', text: 'il manque un étage d’aubes à la turbine' },
  compGap: { cfg: { compSkip: [6] }, part: 'compressor', text: 'il manque un étage au milieu du compresseur' },
  shortStub: { cfg: { stub: 0.55 }, part: 'stub', text: 'le bout d’arbre côté compresseur est plus court' },
  portMoved: { cfg: { portX: 2.2 }, part: 'port', text: 'le piquage du carter turbine a glissé vers l’échappement' },
  noFlange: { cfg: { flangeSkip: 1 }, part: 'flange', text: 'une bride manque sur le carter du compresseur' },
};

// Mutations applicables selon la turbine (le rotor nu n'a ni carter, ni brûleurs, ni conduites).
const POOLS = {
  rotor: [
    [M.turbine3, M.compHalf],
    [M.turbineFlip, M.couplingRight],
    [M.turbine4, M.compGap, M.shortStub],
  ],
  cased: [
    [M.turbine3, M.noBell, M.supportFar, M.fewBurners],
    [M.burnerTilt, M.pipeDir, M.couplingRight],
    [M.turbine4, M.compGap, M.portMoved, M.noFlange],
  ],
};
const ORDER = ['ecorche', 'maquette', 'rotor', 'coupe'];

const $ = (id) => document.getElementById(id);
const els = {
  stage: $('stage'), options: [...document.querySelectorAll('.option')],
  intro: $('intro'), result: $('result'), start: $('start'), again: $('again'), see: $('see'),
  levels: [...document.querySelectorAll('#levels .chip')], levelLabel: $('level-label'), hint: $('hint'),
  timer: $('timer'), timerText: $('timer-text'), timerBar: $('timer-bar'),
  rTitle: $('result-title'), rText: $('result-text'), rEyebrow: $('result-eyebrow'),
};

const RING = 2 * Math.PI * 22;
els.timerBar.style.strokeDasharray = RING;

// Niveau par défaut : ?serie=1|2|3, sinon alternance automatique selon le jour.
// ?turbine=rotor|ecorche|maquette|coupe force une turbine ; sinon elles tournent à chaque manche.
const params = new URLSearchParams(location.search);
const serie = parseInt(params.get('serie'), 10);
const day = Math.floor(Date.now() / 86_400_000);
let level = serie >= 1 && serie <= 3 ? serie - 1 : day % LEVELS.length;
const forced = VARIANTS[params.get('turbine')] ? params.get('turbine') : null;
let turn = day % ORDER.length;

let viewer = null;
let round = null;      // { variant, answer, options: [{cfg, mutation|null}] }
let deadline = 0, raf = 0, playing = false;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function setLevel(i) {
  level = i;
  els.levels.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.level) === i)));
  els.levelLabel.textContent = LEVELS[i];
}

function newRound() {
  const variant = forced || ORDER[turn++ % ORDER.length];
  const pool = POOLS[variant === 'rotor' ? 'rotor' : 'cased'][level];
  const base = { variant };
  const wrong = shuffle(pool).slice(0, 2);
  const options = shuffle([
    { cfg: base, mutation: null },
    ...wrong.map((m) => ({ cfg: { ...base, ...m.cfg }, mutation: m })),
  ]);
  round = { variant, options, answer: options.findIndex((o) => !o.mutation) };
  const urls = renderSchemas(options.map((o) => o.cfg));
  els.options.forEach((btn, i) => {
    btn.querySelector('img').src = urls[i];
    btn.className = 'option';
    btn.disabled = false;
  });
  els.hint.textContent = `${VARIANTS[variant].label} · fais-la pivoter du doigt`;
  viewer.setConfig(base);
  viewer.resetView();
}

function setTimer(remaining) {
  const r = Math.max(0, remaining);
  els.timerText.textContent = String(Math.ceil(r));
  els.timerBar.style.strokeDashoffset = String(RING * (1 - r / DURATION));
  els.timer.classList.toggle('is-low', r <= 10);
}

function loop() {
  if (!playing) return;
  const remaining = (deadline - performance.now()) / 1000;
  setTimer(remaining);
  if (remaining <= 0) return finish(-1);
  raf = requestAnimationFrame(loop);
}

function start() {
  els.intro.hidden = true;
  els.result.hidden = true;
  newRound();
  playing = true;
  deadline = performance.now() + DURATION * 1000;
  loop();
}

function finish(choice) {
  if (!playing) return;
  playing = false;
  cancelAnimationFrame(raf);
  const { answer, options } = round;
  const won = choice === answer;

  els.options.forEach((btn, i) => {
    btn.disabled = true;
    if (i === answer) btn.classList.add('is-correct');
    else if (i === choice) btn.classList.add('is-wrong');
    else btn.classList.add('is-dim');
  });

  // Différence à montrer : celle du schéma choisi, sinon celle d'un des deux faux.
  const shown = choice >= 0 && !won ? options[choice] : options.find((o) => o.mutation);
  round.shown = shown;
  const shownLetter = LETTERS[options.indexOf(shown)];

  if (won) {
    els.rEyebrow.textContent = 'Bonne réponse';
    els.rTitle.innerHTML = 'Bien vu !<br><em>Schéma ' + LETTERS[answer] + '</em>';
    els.rText.innerHTML = 'Tu as l’œil d’un opérateur. <strong>Montre cet écran à l’animateur pour récupérer ton goodie.</strong>';
  } else {
    els.rEyebrow.textContent = choice < 0 ? 'Temps écoulé' : 'Pas tout à fait';
    els.rTitle.innerHTML = 'C’était le<br><em>schéma ' + LETTERS[answer] + '</em>';
    els.rText.textContent = `Dans le schéma ${shownLetter}, ${shown.mutation.text}.`;
  }
  els.see.hidden = won;
  setTimeout(() => { els.result.hidden = false; }, 900);
}

// Ferme le panneau et fait clignoter sur la turbine l'élément concerné.
function seeDifference() {
  els.result.hidden = true;
  viewer.highlight(round.shown.mutation.part);
  setTimeout(() => { els.result.hidden = false; els.see.hidden = true; }, 6000);
}

function init() {
  setLevel(level);
  if (!webglAvailable()) {
    document.getElementById('match').innerHTML =
      '<div class="notice"><h2>La 3D n’est pas disponible sur cet écran.</h2>' +
      '<p>Turbine Match a besoin de WebGL. Le puzzle Build Azito fonctionne partout.</p>' +
      '<a class="btn" href="build-azito.html"><span>Jouer à Build Azito</span></a></div>';
    els.intro.hidden = true;
    return;
  }
  viewer = mountViewer(els.stage);
  setTimer(DURATION);
  // Une manche d'aperçu derrière l'intro ; la vraie est tirée au départ, avec la même turbine.
  newRound();
  turn--;
  els.options.forEach((b) => { b.disabled = true; });

  els.levels.forEach((b) => b.addEventListener('click', () => setLevel(Number(b.dataset.level))));
  els.start.addEventListener('click', start);
  els.again.addEventListener('click', start);
  els.see.addEventListener('click', seeDifference);
  els.options.forEach((btn) => btn.addEventListener('click', () => finish(Number(btn.dataset.i))));
}

init();
