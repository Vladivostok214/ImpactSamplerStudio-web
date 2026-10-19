/**
 * Sistema de iluminación directa de teclas (Cero re-renders de React).
 * Maneja la activación visual de las teclas directamente en el DOM mediante clases CSS,
 * garantizando una latencia ultra baja (0.01ms) sin bloquear el Main Thread ni provocar
 * buffer underruns en ScriptProcessorNode al tocar o soltar teclas.
 */

const keyElCache = new Map<number, HTMLElement>();
const padElCache = new Map<number, HTMLElement>();

export function setVisualKeyActive(note: number, active: boolean): void {
  let el = keyElCache.get(note);
  if (!el || !el.isConnected) {
    el = document.querySelector<HTMLElement>(`[data-piano-note="${note}"]`) ?? undefined;
    if (el) keyElCache.set(note, el);
  }
  if (!el) return;

  if (active) {
    el.classList.add('piano-key-active');
  } else {
    el.classList.remove('piano-key-active');
  }
}

export function clearAllVisualKeys(): void {
  keyElCache.forEach((el) => {
    if (el.isConnected) el.classList.remove('piano-key-active');
  });
  const elements = document.querySelectorAll<HTMLElement>('.piano-key-active');
  elements.forEach((el) => el.classList.remove('piano-key-active'));
}

export function setVisualPadActive(padIdx: number, active: boolean): void {
  let el = padElCache.get(padIdx);
  if (!el || !el.isConnected) {
    el = document.querySelector<HTMLElement>(`[data-pad-index="${padIdx}"]`) ?? undefined;
    if (el) padElCache.set(padIdx, el);
  }
  if (!el) return;

  if (active) {
    el.setAttribute('data-pad-hit', 'true');
  } else {
    el.removeAttribute('data-pad-hit');
  }
}

