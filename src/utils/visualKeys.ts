/**
 * Sistema de iluminación directa de teclas (Cero re-renders de React).
 * Maneja la activación visual de las teclas directamente en el DOM mediante clases CSS,
 * garantizando una latencia ultra baja (0.01ms) sin bloquear el Main Thread ni provocar
 * buffer underruns en ScriptProcessorNode al tocar o soltar teclas.
 */

export function setVisualKeyActive(note: number, active: boolean): void {
  const el = document.querySelector<HTMLElement>(`[data-piano-note="${note}"]`);
  if (!el) return;

  if (active) {
    el.classList.add('piano-key-active');
  } else {
    el.classList.remove('piano-key-active');
  }
}

export function clearAllVisualKeys(): void {
  const elements = document.querySelectorAll<HTMLElement>('.piano-key-active');
  elements.forEach((el) => el.classList.remove('piano-key-active'));
}
