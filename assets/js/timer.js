// Chrono à rebours partagé par les deux jeux : chiffres + anneau qui se vide, alerte sur les 10 dernières secondes.
const RING = 2 * Math.PI * 22; // rayon du cercle dans le SVG (viewBox 52)

export function makeTimer({ root, text, bar }, duration) {
  bar.style.strokeDasharray = RING;
  return (remaining) => {
    const r = Math.max(0, Math.min(duration, remaining));
    text.textContent = String(Math.ceil(r));
    bar.style.strokeDashoffset = String(RING * (1 - r / duration));
    root.classList.toggle('is-low', r <= 10);
  };
}
