// Comportements « borne » : inscription avant les jeux, retour à l'accueil après inactivité, plein écran,
// pas de zoom, menu caché de l'animateur (classement, export des inscriptions).
import { clearScores } from './scores.js';
import { GAMES, REMOTE, getPlayer, clearPlayer, syncRegistrations, countRegistrations, exportCsv } from './inscriptions.js';

const IDLE_MS = 60_000;
const page = document.body.dataset.page;
const isHome = page === 'home';
const isGame = page === 'match' || page === 'build';

// Pas de jeu sans inscription : on passe d'abord par le formulaire, qui renvoie ensuite vers ce jeu.
if (isGame && !getPlayer()) {
  const here = location.pathname.split('/').pop().replace(/\.html$/, '') + '.html';
  location.replace(`inscription.html${GAMES.includes(here) ? `?vers=${here}` : ''}`);
}

// Inscriptions restées en attente (hors connexion, page quittée trop vite) : on les renvoie.
syncRegistrations();

// Retour automatique à l'accueil (toutes les pages sauf l'accueil), annoncé 10 secondes avant.
// Le joueur en cours est oublié : le visiteur suivant s'inscrit à son tour.
if (!isHome) {
  const WARN_MS = 10_000;
  let timer = 0, tick = 0, toast = null;
  const hide = () => {
    clearInterval(tick);
    if (toast) { toast.remove(); toast = null; }
  };
  const warn = () => {
    let left = WARN_MS / 1000;
    toast = document.createElement('p');
    toast.className = 'idle';
    toast.setAttribute('role', 'status');
    const say = () => { toast.textContent = `Tu es toujours là ? Touche l’écran pour continuer. Retour à l’accueil dans ${left} s.`; };
    say();
    document.body.append(toast);
    tick = setInterval(() => {
      left -= 1;
      if (left <= 0) { clearPlayer(); location.href = 'index.html'; return; }
      say();
    }, 1000);
  };
  const arm = () => {
    clearTimeout(timer);
    hide();
    timer = setTimeout(warn, IDLE_MS - WARN_MS);
  };
  ['pointerdown', 'pointermove', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, arm, { passive: true })
  );
  arm();
}

// Accueil : rappel du joueur en cours, avec de quoi changer de joueur. Oublié après une minute sans activité.
if (isHome) {
  const actions = document.querySelector('.topbar__actions');
  let box = null, timer = 0;
  const forget = () => {
    clearPlayer();
    if (box) { box.remove(); box = null; }
  };
  const player = getPlayer();
  if (player && actions) {
    box = document.createElement('p');
    box.className = 'player';
    const name = document.createElement('span');
    name.textContent = `Joueur : ${player.prenom}`; // textContent : le prénom est saisi par le public
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--sm btn--ghostOnDark';
    const label = document.createElement('span');
    label.textContent = 'Ce n’est pas toi ?';
    btn.append(label);
    btn.addEventListener('click', forget);
    box.append(name, btn);
    actions.prepend(box);
    const arm = () => { clearTimeout(timer); timer = setTimeout(forget, IDLE_MS); };
    ['pointerdown', 'pointermove', 'keydown', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, arm, { passive: true })
    );
    arm();
  }
}

// Plein écran
const fsBtn = document.querySelector('[data-fullscreen]');
if (fsBtn) {
  if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
}

// Pas de zoom par pincement ni de menu contextuel sur la borne
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// ---------- Menu de l'animateur : appui long (3 s) sur le logo ----------
function button(text, variant) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${variant}`;
  const span = document.createElement('span');
  span.textContent = text;
  b.append(span);
  return b;
}

function openStaffMenu() {
  if (document.getElementById('staff')) return;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'staff';
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Menu de l’animateur');
  const title = document.createElement('h2');
  title.textContent = 'Menu de l’animateur';
  const info = document.createElement('p');
  const n = countRegistrations();
  info.textContent = REMOTE
    ? `${n} inscription${n > 1 ? 's' : ''} en attente d’envoi sur ce poste. Les autres sont déjà dans la base en ligne.`
    : `${n} inscription${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} sur ce poste.`;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.hidden = true;

  const exportBtn = button('Exporter les inscriptions (CSV)', 'btn--onDark');
  exportBtn.addEventListener('click', () => {
    const count = exportCsv();
    status.hidden = false;
    status.textContent = `Fichier créé avec ${count} inscription${count > 1 ? 's' : ''}. Sur la borne Windows, il est sur le Bureau.`;
  });

  const resetBtn = button('Remettre à zéro le classement', 'btn--ghostOnDark');
  let armed = false;
  resetBtn.addEventListener('click', () => {
    if (!armed) { // deuxième appui pour confirmer
      armed = true;
      resetBtn.firstChild.textContent = 'Confirmer la remise à zéro';
      return;
    }
    clearScores();
    location.reload();
  });

  const closeBtn = button('Fermer', 'btn--ghostOnDark');
  closeBtn.addEventListener('click', () => overlay.remove());

  const actions = document.createElement('div');
  actions.className = 'panel__actions';
  actions.append(exportBtn, resetBtn, closeBtn);
  panel.append(title, info, status, actions);
  overlay.append(panel);
  document.body.append(overlay);
}

const logo = document.querySelector('.logo');
if (logo) {
  let hold = 0, held = false;
  const cancel = () => clearTimeout(hold);
  logo.addEventListener('pointerdown', () => {
    held = false;
    hold = setTimeout(() => { held = true; openStaffMenu(); }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => logo.addEventListener(ev, cancel));
  // Après un appui long, relâcher le doigt ne doit pas suivre le lien vers l'accueil.
  logo.addEventListener('click', (e) => { if (held) { e.preventDefault(); held = false; } });
  logo.addEventListener('dragstart', (e) => e.preventDefault());
}
