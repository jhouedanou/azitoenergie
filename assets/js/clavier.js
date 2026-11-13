// Clavier tactile de la borne (AZERTY). Il écrit dans le champ actif, sans dépendre du clavier de Windows.
const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', { act: 'back', label: 'Effacer', wide: 2 }],
  ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '.'],
  ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', '-', '_'],
  [{ act: 'shift', label: 'Maj', wide: 2 }, 'w', 'x', 'c', 'v', 'b', 'n', '’', 'é', 'è', 'ê'],
  ['à', 'ç', 'ô', 'î', 'ù', { act: 'space', label: 'Espace', wide: 4 }, { act: 'next', label: 'Suivant', wide: 3 }],
];

// fields : champs de saisie, dans l'ordre. onDone : appelé par « Suivant » sur le dernier champ.
export function mountKeyboard(container, fields, { onDone } = {}) {
  let target = fields[0];
  let shift = false;
  const letters = [];
  let shiftKey = null;

  const paint = () => {
    letters.forEach((b) => { b.textContent = shift ? b.dataset.ch.toUpperCase() : b.dataset.ch; });
    shiftKey.setAttribute('aria-pressed', String(shift));
  };
  // Majuscule automatique au début d'un nom ou d'un prénom
  const autoShift = () => {
    shift = target.dataset.cap === 'on' && (target.value === '' || /[\s-]$/.test(target.value));
    paint();
  };
  const insert = (text) => {
    const max = target.maxLength > 0 ? target.maxLength : Infinity;
    const start = target.selectionStart ?? target.value.length, end = target.selectionEnd ?? start;
    if (target.value.length - (end - start) + text.length > max) return;
    target.setRangeText(text, start, end, 'end');
    target.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const act = {
    back() {
      const start = target.selectionStart ?? target.value.length, end = target.selectionEnd ?? start;
      if (start === end && start === 0) return;
      target.setRangeText('', start === end ? start - 1 : start, end, 'end');
      target.dispatchEvent(new Event('input', { bubbles: true }));
    },
    shift() { shift = !shift; paint(); },
    space() { if (target.type !== 'email' && target.dataset.space !== 'off') insert(' '); },
    next() {
      const i = fields.indexOf(target);
      if (i < fields.length - 1) fields[i + 1].focus();
      else onDone?.();
    },
  };

  for (const row of ROWS) {
    const line = document.createElement('div');
    line.className = 'kbd__row';
    for (const k of row) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kbd__key';
      b.tabIndex = -1; // le clavier ne prend jamais le focus : il reste dans le champ
      if (typeof k === 'string') {
        b.dataset.ch = k;
        b.textContent = k;
        letters.push(b);
      } else {
        b.dataset.act = k.act;
        b.textContent = k.label;
        b.style.setProperty('--span', k.wide);
        b.classList.add('kbd__key--wide');
        if (k.act === 'shift') shiftKey = b;
        if (k.act === 'next') b.classList.add('kbd__key--next');
      }
      line.append(b);
    }
    container.append(line);
  }

  // pointerdown + preventDefault : le champ garde le focus et le curseur
  container.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.kbd__key');
    if (!b) return;
    e.preventDefault();
    if (document.activeElement !== target) target.focus();
    if (b.dataset.act) {
      act[b.dataset.act]();
      if (b.dataset.act !== 'shift') autoShift();
    } else {
      insert(shift ? b.dataset.ch.toUpperCase() : b.dataset.ch);
      autoShift();
    }
  });

  fields.forEach((f) => {
    f.inputMode = 'none'; // pas de clavier du système par-dessus celui-ci
    f.addEventListener('focus', () => { target = f; autoShift(); });
    f.addEventListener('input', () => { if (f === target) autoShift(); });
  });
  autoShift();
}
