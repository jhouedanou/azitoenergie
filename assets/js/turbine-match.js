// Turbine Match — observer une turbine, trouver le seul schéma identique parmi A / B / C.
// Le visiteur choisit l'une des 4 turbines (recréations three.js des visuels du dossier images/turbine).
// Le niveau est un réglage d'animateur : ?serie=1|2|3, sinon il alterne chaque jour.
import { mountViewer, renderSchemas, webglAvailable, VARIANTS } from './turbine-model.js';
import { makeTimer } from './timer.js';

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
const ORDER = ['rotor', 'ecorche', 'maquette', 'coupe']; // ordre des vignettes

const $ = (id) => document.getElementById(id);
const els = {
  picker: $('picker'), grid: $('grid'), match: $('match'), stage: $('stage'),
  options: [...document.querySelectorAll('.option')],
  prompt: $('prompt'), verdict: $('verdict'), vTitle: $('verdict-title'), vText: $('verdict-text'),
  again: $('again'), see: $('see'), other: $('other'), levelLabel: $('level-label'),
};
const setTimer = makeTimer({ root: $('timer'), text: $('timer-text'), bar: $('timer-bar') }, DURATION);

// ?turbine=rotor|ecorche|maquette|coupe force une turbine et saute l'écran de choix.
const params = new URLSearchParams(location.search);
const serie = parseInt(params.get('serie'), 10);
const day = Math.floor(Date.now() / 86_400_000);
const level = serie >= 1 && serie <= 3 ? serie - 1 : day % LEVELS.length;
const forced = VARIANTS[params.get('turbine')] ? params.get('turbine') : null;
let current = forced || ORDER[0]; // turbine choisie

let viewer = null;
let round = null;      // { variant, answer, options: [{cfg, mutation|null}], shown }
let deadline = 0, raf = 0, playing = false;

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function newRound() {
  const variant = current;
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
    btn.querySelector('.option__mark').hidden = true;
  });
  viewer.setConfig(base);
  viewer.resetView();
}

function loop() {
  if (!playing) return;
  const remaining = (deadline - performance.now()) / 1000;
  setTimer(remaining);
  if (remaining <= 0) return finish(-1);
  raf = requestAnimationFrame(loop);
}

// Vignettes des 4 turbines (rendu schéma), une seule fois.
function buildPicker() {
  const urls = renderSchemas(ORDER.map((variant) => ({ variant })), 800, 450);
  ORDER.forEach((variant, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick pick--schema';
    const img = document.createElement('img');
    img.src = urls[i];
    img.alt = '';
    const span = document.createElement('span');
    span.textContent = VARIANTS[variant].label;
    btn.append(img, span);
    btn.addEventListener('click', () => { current = variant; start(); });
    els.grid.append(btn);
  });
}

function showBar(verdict) {
  els.prompt.hidden = verdict;
  els.verdict.hidden = !verdict;
}

function toPicker() {
  playing = false;
  cancelAnimationFrame(raf);
  setTimer(DURATION);
  if (forced) return start();
  els.match.hidden = true;
  els.picker.hidden = false;
}

function start() {
  els.picker.hidden = true;
  els.match.hidden = false;
  showBar(false);
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
    const mark = btn.querySelector('.option__mark');
    if (i === answer) { btn.classList.add('is-correct'); mark.textContent = 'Le bon schéma'; mark.hidden = false; }
    else if (i === choice) { btn.classList.add('is-wrong'); mark.textContent = 'Ton choix'; mark.hidden = false; }
    else btn.classList.add('is-dim');
  });

  // Différence à montrer : celle du schéma choisi, sinon celle d'un des deux faux.
  const shown = choice >= 0 && !won ? options[choice] : options.find((o) => o.mutation);
  round.shown = shown;
  const shownLetter = LETTERS[options.indexOf(shown)];

  if (won) {
    els.vTitle.textContent = `Bien vu ! C’est le schéma ${LETTERS[answer]}`;
    els.vText.innerHTML = '<strong>Montre cet écran à l’animateur pour récupérer ton goodie.</strong>';
  } else {
    els.vTitle.textContent = choice < 0
      ? `Temps écoulé. C’était le schéma ${LETTERS[answer]}`
      : `Raté. C’était le schéma ${LETTERS[answer]}`;
    els.vText.textContent = `Dans le schéma ${shownLetter}, ${shown.mutation.text}.`;
  }
  els.see.hidden = won;
  showBar(true);
}

// Fait clignoter sur la turbine l'élément concerné : les schémas restent sous les yeux.
function seeDifference() {
  viewer.resetView();
  viewer.highlight(round.shown.mutation.part);
  els.see.hidden = true;
}

function init() {
  els.levelLabel.textContent = LEVELS[level];
  if (!webglAvailable()) {
    els.picker.hidden = true;
    els.match.hidden = false;
    els.match.innerHTML =
      '<div class="notice"><h2>La 3D n’est pas disponible sur cet écran</h2>' +
      '<p>Turbine Match a besoin de WebGL. Le puzzle Build Azito fonctionne partout.</p>' +
      '<a class="btn" href="build-azito.html"><span>Jouer à Build Azito</span></a></div>';
    return;
  }
  // Les <img> des schémas sont créés ici : jamais d'image sans source dans la page.
  els.options.forEach((btn) => {
    const img = document.createElement('img');
    img.alt = '';
    btn.prepend(img);
    btn.addEventListener('click', () => finish(Number(btn.dataset.i)));
  });
  viewer = mountViewer(els.stage);
  setTimer(DURATION);
  els.again.addEventListener('click', start);
  els.other.addEventListener('click', toPicker);
  els.see.addEventListener('click', seeDifference);
  if (forced) start();
  else buildPicker();
}

init();
