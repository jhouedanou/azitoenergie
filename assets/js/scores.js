// Meilleurs temps du jour.
// Chaque temps est d'abord écrit sur la borne (le jeu marche hors connexion), puis envoyé à Supabase.
// Un temps qui n'a pas pu partir reste en attente et repart au prochain affichage du classement.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const PREFIX = 'azito.scores.';
const CUTOFF = 'azito.scores.cutoff'; // remise à zéro par l'animateur : on masque ce qui précède
const REMOTE = Boolean(SUPABASE_URL && SUPABASE_KEY);
const API = `${SUPABASE_URL}/rest/v1/scores`;
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
const TIMEOUT_MS = 4000;

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function read(day = today()) {
  try {
    const list = JSON.parse(localStorage.getItem(PREFIX + day) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(day, list) {
  try {
    localStorage.setItem(PREFIX + day, JSON.stringify(list.sort((a, b) => a.time - b.time).slice(0, 50)));
  } catch { /* stockage indisponible : le jeu reste jouable */ }
}

function cutoff() {
  try { return localStorage.getItem(CUTOFF) || ''; } catch { return ''; }
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const byTime = (a, b) => a.time - b.time || (a.at || '').localeCompare(b.at || '');

export function topScores(n = 10) {
  return read().sort(byTime).slice(0, n);
}

// Envoie les temps en attente (du jour et des jours précédents encore présents sur la borne).
async function sync() {
  if (!REMOTE) return;
  let keys = [];
  try { keys = Object.keys(localStorage).filter((k) => /^azito\.scores\.\d{4}-\d{2}-\d{2}$/.test(k)); } catch { return; }
  for (const key of keys) {
    const day = key.slice(PREFIX.length);
    const list = read(day);
    const pending = list.filter((s) => !s.synced && /^[0-9a-f-]{36}$/.test(s.id)); // les anciens identifiants locaux ne partent pas
    if (!pending.length) continue;
    try {
      const res = await fetch(`${API}?on_conflict=id`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(pending.map((s) => ({ id: s.id, day, name: s.name, time_s: s.time, puzzle: s.puzzle }))),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) continue; // refus ou panne : on réessaiera
      pending.forEach((s) => { s.synced = true; });
      write(day, list);
    } catch { /* hors connexion : on réessaiera */ }
  }
}

// Classement du jour côté Supabase, ou null si injoignable.
async function fetchRemote(limit) {
  if (!REMOTE) return null;
  const q = new URLSearchParams({ select: 'id,name,time_s,puzzle,created_at', day: `eq.${today()}`, order: 'time_s.asc,created_at.asc', limit: String(limit) });
  const since = cutoff();
  if (since.slice(0, 10) === new Date().toISOString().slice(0, 10)) q.set('created_at', `gte.${since}`);
  try {
    const res = await fetch(`${API}?${q}`, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()).map((r) => ({ id: r.id, name: r.name, time: Number(r.time_s), puzzle: r.puzzle, at: r.created_at }));
  } catch {
    return null;
  }
}

// Retourne l'entrée créée (avec son id) pour pouvoir la surligner dans le classement.
export function addScore(name, time, puzzle) {
  const entry = {
    id: uuid(),
    name: (name || '').trim().slice(0, 14) || 'Anonyme',
    time: Math.min(60, Math.max(0.1, Math.round(time * 10) / 10)),
    puzzle,
    at: new Date().toISOString(),
    synced: false,
  };
  const list = read();
  list.push(entry);
  write(today(), list);
  return entry;
}

// Remise à zéro par l'animateur : les temps restent dans Supabase, la borne masque ceux d'avant.
export function clearScores() {
  try {
    localStorage.removeItem(PREFIX + today());
    localStorage.setItem(CUTOFF, new Date().toISOString());
  } catch { /* idem */ }
}

export function formatTime(t) {
  return t.toFixed(1).replace('.', ',') + ' s';
}

function paint(container, list, highlightId) {
  container.replaceChildren();
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'board__empty';
    p.textContent = 'Personne n’a encore joué aujourd’hui. Sois le premier au classement.';
    container.append(p);
    return;
  }
  const ol = document.createElement('ol');
  ol.className = 'board';
  list.forEach((s, i) => {
    const li = document.createElement('li');
    if (s.id === highlightId) li.className = 'is-me';
    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(i + 1);
    const name = document.createElement('span');
    name.textContent = s.name; // textContent : les pseudos sont saisis par le public
    const time = document.createElement('b');
    time.textContent = formatTime(s.time);
    li.append(rank, name, time);
    ol.append(li);
  });
  container.append(ol);
}

// Affiche tout de suite le classement de la borne, puis le remplace par celui de Supabase dès qu'il répond.
export async function renderBoard(container, { limit = 5, highlightId = null } = {}) {
  paint(container, topScores(limit), highlightId);
  if (!REMOTE) return;
  await sync();
  const remote = await fetchRemote(limit);
  if (!remote) return; // injoignable : on garde l'affichage local
  const seen = new Set(remote.map((s) => s.id));
  const merged = [...remote, ...read().filter((s) => !s.synced && !seen.has(s.id))].sort(byTime).slice(0, limit);
  paint(container, merged, highlightId);
}
