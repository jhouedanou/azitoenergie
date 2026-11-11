// Fenêtre Windows de la borne : le site est servi depuis l'application, sans serveur, sans navigateur, sans Internet.
const { app, BrowserWindow, powerSaveBlocker, protocol, session } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const WEB = path.join(__dirname, 'web');
const HOME = 'app://azito/index.html';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const smoke = process.argv.includes('--smoke'); // contrôle sans affichage, utilisé avant de livrer
const sorties = []; // adresses Internet demandées par les pages (aucune attendue)
let quitting = false;

// Une adresse fixe (app://azito) : le classement enregistré sur la borne est conservé d'un lancement à l'autre.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (!app.requestSingleInstanceLock()) app.quit();

async function serve(request) {
  let rel = decodeURIComponent(new URL(request.url).pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(WEB, rel));
  if (!file.startsWith(WEB + path.sep)) return new Response('Interdit', { status: 403 });
  try {
    const body = await fs.readFile(file);
    return new Response(body, { headers: { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
}

function quit() {
  quitting = true;
  app.quit();
}

// Touches qui feraient sortir un visiteur du jeu si un clavier est branché sur la borne.
function isBlocked(input) {
  const key = input.key.toLowerCase();
  if (key === 'f11' || key === 'f5' || key === 'f12') return true;
  if (input.alt && key === 'f4') return true;
  if (input.control && ['w', 'r', 'n', 'p', '+', '-', '=', '0'].includes(key)) return true;
  if (input.control && input.shift && key === 'i') return true;
  return false;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: !smoke,
    kiosk: !smoke,
    autoHideMenuBar: true,
    backgroundColor: '#313280',
    title: 'Les défis du stand Azito Energie',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  win.removeMenu();
  if (!smoke) win.setAlwaysOnTop(true, 'screen-saver');

  // Ctrl+Maj+Q : seule sortie, réservée à l'animateur.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.control && input.shift && input.key.toLowerCase() === 'q') {
      event.preventDefault();
      quit();
    } else if (isBlocked(input)) {
      event.preventDefault();
    }
  });
  win.on('close', (event) => {
    if (!quitting && !smoke) event.preventDefault();
  });

  // On ne quitte jamais le jeu : ni lien externe, ni nouvelle fenêtre, ni zoom.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('app://azito/')) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('did-finish-load', () => {
    win.webContents.setVisualZoomLevelLimits(1, 1);
    win.webContents.setZoomFactor(1);
  });

  // Si la page plante ou se fige, on revient à l'accueil plutôt que de laisser un écran mort.
  win.webContents.on('render-process-gone', () => { if (!quitting) win.loadURL(HOME); });
  win.on('unresponsive', () => { if (!quitting) win.webContents.forcefullyCrashRenderer(); });

  win.loadURL(HOME);

  if (smoke) {
    win.webContents.once('did-finish-load', async () => {
      try {
        const report = await win.webContents.executeJavaScript(`(async () => {
          await document.fonts.ready;
          await new Promise((r) => setTimeout(r, 2500));
          return {
            titre: document.title,
            polices: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight),
            turbine: Boolean(document.querySelector('#hero-stage canvas')),
            classement: document.getElementById('board').textContent.slice(0, 80),
          };
        })()`);
        report.internet = sorties;
        console.log('SMOKE ' + JSON.stringify(report));
        if (sorties.length) process.exitCode = 1;
      } catch (err) {
        console.error('SMOKE ERREUR', err);
        process.exitCode = 1;
      }
      quit();
    });
  }
}

app.on('second-instance', () => {
  const [win] = BrowserWindow.getAllWindows();
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

app.whenReady().then(() => {
  protocol.handle('app', serve);
  // La borne ne contacte jamais Internet : toute demande vers l'extérieur est refusée.
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
    sorties.push(details.url);
    callback({ cancel: true });
  });
  if (!smoke) powerSaveBlocker.start('prevent-display-sleep');
  createWindow();
});

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => app.quit());
