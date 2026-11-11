// Comportements « borne » : retour à l'accueil après inactivité, plein écran, pas de zoom, RAZ cachée du classement.
import { clearScores } from './scores.js';

const IDLE_MS = 60_000;
const isHome = document.body.dataset.page === 'home';

// Retour automatique à l'accueil (pages de jeu uniquement), annoncé 10 secondes avant
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
      if (left <= 0) { location.href = 'index.html'; return; }
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

// Appui long (3 s) sur le logo → remise à zéro du classement du jour (animateur)
const logo = document.querySelector('.logo');
if (logo) {
  let hold = 0;
  const cancel = () => clearTimeout(hold);
  logo.addEventListener('pointerdown', () => {
    hold = setTimeout(() => {
      if (confirm('Remettre à zéro le classement du jour ?')) {
        clearScores();
        location.reload();
      }
    }, 3000);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => logo.addEventListener(ev, cancel));
  logo.addEventListener('dragstart', (e) => e.preventDefault());
}
