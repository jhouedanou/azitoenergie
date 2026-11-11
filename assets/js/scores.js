// Meilleurs temps du jour — stockés localement sur la borne (pas de serveur).
const PREFIX = 'azito.scores.';

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${PREFIX}${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(todayKey()) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function topScores(n = 10) {
  return read().sort((a, b) => a.time - b.time).slice(0, n);
}

// Retourne l'entrée créée (avec son id) pour pouvoir la surligner dans le classement.
export function addScore(name, time, puzzle) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: (name || '').trim().slice(0, 14) || 'Anonyme',
    time: Math.round(time * 10) / 10,
    puzzle,
  };
  const list = read();
  list.push(entry);
  try {
    localStorage.setItem(todayKey(), JSON.stringify(list.sort((a, b) => a.time - b.time).slice(0, 50)));
  } catch { /* stockage indisponible : le jeu reste jouable */ }
  return entry;
}

export function clearScores() {
  try { localStorage.removeItem(todayKey()); } catch { /* idem */ }
}

export function formatTime(t) {
  return t.toFixed(1).replace('.', ',') + ' s';
}

// Remplit un conteneur avec le classement (DOM construit sans innerHTML : les pseudos sont saisis par le public).
export function renderBoard(container, { limit = 5, highlightId = null } = {}) {
  const list = topScores(limit);
  container.replaceChildren();
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'board__empty';
    p.textContent = 'Aucun temps enregistré aujourd’hui. À toi d’ouvrir le classement.';
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
    name.textContent = s.name;
    const time = document.createElement('b');
    time.textContent = formatTime(s.time);
    li.append(rank, name, time);
    ol.append(li);
  });
  container.append(ol);
}
