// Inscriptions des visiteurs (nom, prénom, e-mail, profil), demandées avant de jouer.
// Même principe que le classement : chaque inscription est d'abord écrite sur le poste, puis envoyée à Supabase.
// En ligne, une inscription envoyée est retirée du poste. Sur la borne hors connexion, elles restent
// sur le poste et l'animateur les exporte en CSV (appui long sur le logo).
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { uuid } from './scores.js';

const STORE = 'azito.inscriptions';
const PLAYER = 'azito.player'; // joueur en cours : sessionStorage, effacé au retour à l'accueil pour inactivité
export const REMOTE = Boolean(SUPABASE_URL && SUPABASE_KEY);
const API = `${SUPABASE_URL}/rest/v1/inscriptions`;
const HEADERS = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
const TIMEOUT_MS = 4000;

// Liste des profils proposés. La même liste est contrôlée dans supabase/inscriptions.sql.
export const PROFILS = ['Étudiant', 'Professionnel', 'Institutionnel', 'Autre'];
export const GAMES = ['turbine-match.html', 'build-azito.html'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch { return false; }
}

// ---------- Joueur en cours ----------
export function getPlayer() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PLAYER) || 'null');
    return p && p.prenom ? p : null;
  } catch {
    return null;
  }
}

export function clearPlayer() {
  try { sessionStorage.removeItem(PLAYER); } catch { /* stockage indisponible */ }
}

// ---------- Contrôle du formulaire ----------
// Retourne { champ: message } ; objet vide si tout est bon.
export function validate(data) {
  const errors = {};
  const nom = clean(data.nom), prenom = clean(data.prenom), email = clean(data.email);
  if (nom.length < 2) errors.nom = 'Écris ton nom.';
  if (prenom.length < 2) errors.prenom = 'Écris ton prénom.';
  if (!EMAIL.test(email)) errors.email = 'Écris une adresse e-mail valide.';
  if (!PROFILS.includes(data.profil)) errors.profil = 'Choisis ton profil.';
  return errors;
}

// Enregistre l'inscription sur le poste et la retient comme joueur en cours.
export function addRegistration(data) {
  const entry = {
    id: uuid(),
    at: new Date().toISOString(),
    nom: clean(data.nom).slice(0, 40),
    prenom: clean(data.prenom).slice(0, 40),
    email: clean(data.email).toLowerCase().slice(0, 120),
    profil: data.profil,
  };
  const list = read();
  list.push(entry);
  write(list);
  try { sessionStorage.setItem(PLAYER, JSON.stringify({ id: entry.id, prenom: entry.prenom })); } catch { /* idem */ }
  return entry;
}

// Envoie les inscriptions en attente, une par une : un doublon (409) compte comme déjà reçu.
let syncing = null;
export function syncRegistrations() {
  if (!REMOTE) return Promise.resolve();
  if (syncing) return syncing;
  syncing = (async () => {
    // Un envoi lancé il y a moins de 6 s (page précédente) est peut-être encore en route : on ne le double pas.
    for (const entry of read().filter((e) => !(Date.now() - (e.tryAt || 0) < TIMEOUT_MS + 2000))) {
      write(read().map((e) => (e.id === entry.id ? { ...e, tryAt: Date.now() } : e)));
      try {
        const res = await fetch(API, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify({ id: entry.id, created_at: entry.at, nom: entry.nom, prenom: entry.prenom, email: entry.email, profil: entry.profil }),
          keepalive: true, // l'envoi continue même si la page change (départ vers le jeu)
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok && res.status !== 409) continue; // refus ou panne : on réessaiera
        write(read().filter((e) => e.id !== entry.id)); // reçue : on ne garde pas de données personnelles sur le poste
      } catch { /* hors connexion : on réessaiera */ }
    }
  })().finally(() => { syncing = null; });
  return syncing;
}

export function countRegistrations() {
  return read().length;
}

// ---------- Export pour l'animateur ----------
const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // pas de formule exécutée à l'ouverture dans Excel
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCsv(list = read()) {
  const rows = [['Date', 'Nom', 'Prénom', 'E-mail', 'Profil'], ...list.map((e) => [e.at, e.nom, e.prenom, e.email, e.profil])];
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'; // BOM + « ; » : lisible dans Excel en français
}

// Télécharge le fichier ; sur la borne Windows, l'application l'enregistre sur le Bureau.
export function exportCsv() {
  const list = read();
  const url = URL.createObjectURL(new Blob([toCsv(list)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `azito-inscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return list.length;
}
