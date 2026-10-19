import { useEffect, useRef, useState, useCallback } from 'react';

export const QWERTY_BASE_NOTE = 60; // C4 (Middle C)
export const QWERTY_VELOCITY = 127;
export const MIN_OCTAVE_OFFSET = -2; // C2 (36)
export const MAX_OCTAVE_OFFSET = 2; // C6 (84)

export const QWERTY_OCTAVE_DOWN = 'KeyZ';
export const QWERTY_OCTAVE_UP = 'KeyX';

export const QWERTY_NOTE_OFFSETS: Record<string, number> = {
  KeyA: 0, // C
  KeyW: 1, // C#
  KeyS: 2, // D
  KeyE: 3, // D#
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6, // F#
  KeyG: 7, // G
  KeyY: 8, // G#
  KeyH: 9, // A
  KeyU: 10, // A#
  KeyJ: 11, // B
  KeyK: 12, // C (+1 octava)
  KeyO: 13, // C# (+1)
  KeyL: 14, // D (+1)
  KeyP: 15, // D# (+1)
  Semicolon: 16, // E (+1)
  Quote: 17, // F (+1)
};

export const QWERTY_PAD_NOTES: Record<string, number> = {
  Digit1: 36, // P1 · Kick
  Digit2: 38, // P2 · Snare
  Digit3: 42, // P3 · Closed HH
  Digit4: 46, // P4 · Open HH
  Digit5: 41, // P5 · Low Tom
  Digit6: 45, // P6 · Mid Tom
  Digit7: 49, // P7 · Crash
  Digit8: 51, // P8 · Ride
};

export interface KeyRange {
  minNote: number;
  maxNote: number;
  label?: string;
}

export interface UseQwertyKeyboardOptions {
  enabled: boolean;
  velocity?: number;
  keyRange?: KeyRange;
  onNoteOn: (note: number, velocity: number, isPad?: boolean) => void;
  onNoteOff: (note: number, isPad?: boolean) => void;
  onTogglePlay?: () => void;
  onStop?: () => void;
}

interface ActiveKeyEntry {
  type: 'note' | 'pad';
  note: number;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  if (!target.isConnected) {
    return false;
  }

  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  const modalContainer = target.closest("dialog, [role='dialog'], [data-modal]");
  if (modalContainer && modalContainer.isConnected) {
    // Si el usuario está interactuando con un elemento editable dentro del modal
    if (target.matches('input, textarea, [contenteditable="true"]')) {
      return true;
    }
  }

  return false;
}

export function useQwertyKeyboard({
  enabled,
  velocity = QWERTY_VELOCITY,
  keyRange,
  onNoteOn,
  onNoteOff,
  onTogglePlay,
  onStop,
}: UseQwertyKeyboardOptions) {
  const [octaveOffset, setOctaveOffset] = useState<number>(0);

  // Registro de teclas físicas activas para evitar notas colgadas al cambiar de octava
  const activeKeysRef = useRef<Map<string, ActiveKeyEntry>>(new Map());

  // Callbacks en ref para no re-vincular los listeners de window continuamente
  const callbacksRef = useRef({ onNoteOn, onNoteOff, onTogglePlay, onStop });
  callbacksRef.current = { onNoteOn, onNoteOff, onTogglePlay, onStop };

  const stateRef = useRef({ octaveOffset, keyRange, enabled, velocity });
  stateRef.current = { octaveOffset, keyRange, enabled, velocity };

  const releaseAll = useCallback(() => {
    if (activeKeysRef.current.size === 0) return;

    activeKeysRef.current.forEach((entry) => {
      callbacksRef.current.onNoteOff(entry.note, entry.type === 'pad');
    });

    activeKeysRef.current.clear();
  }, []);

  // Liberar todas las notas activas si se desactiva QWERTY
  useEffect(() => {
    if (!enabled) {
      releaseAll();
    }
  }, [enabled, releaseAll]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      if (isTypingTarget(e.target)) {
        return;
      }

      // Atajos de Transporte Global (Espacio = Play/Pause, Esc = Stop)
      if (e.code === 'Space') {
        callbacksRef.current.onTogglePlay?.();
        e.preventDefault();
        return;
      }

      if (e.code === 'Escape') {
        callbacksRef.current.onStop?.();
        e.preventDefault();
        return;
      }

      // Evitar disparo duplicado si la tecla ya está activa
      if (activeKeysRef.current.has(e.code)) {
        return;
      }

      // Cambio de octava con Z y X
      if (e.code === QWERTY_OCTAVE_DOWN) {
        setOctaveOffset((prev) => Math.max(MIN_OCTAVE_OFFSET, prev - 1));
        e.preventDefault();
        return;
      }

      if (e.code === QWERTY_OCTAVE_UP) {
        setOctaveOffset((prev) => Math.min(MAX_OCTAVE_OFFSET, prev + 1));
        e.preventDefault();
        return;
      }

      // Pads rítmicos (Teclas 1 a 8)
      if (e.code in QWERTY_PAD_NOTES) {
        const padNote = QWERTY_PAD_NOTES[e.code];
        activeKeysRef.current.set(e.code, { type: 'pad', note: padNote });
        callbacksRef.current.onNoteOn(padNote, stateRef.current.velocity, true);
        e.preventDefault();
        return;
      }

      // Notas melódicas de piano
      if (e.code in QWERTY_NOTE_OFFSETS) {
        const semitoneOffset = QWERTY_NOTE_OFFSETS[e.code];
        const note = QWERTY_BASE_NOTE + stateRef.current.octaveOffset * 12 + semitoneOffset;

        // Comprobación de límites MIDI
        if (note < 0 || note > 127) {
          return;
        }

        // Comprobación de rango acústico del instrumento si está definido
        const currentKeyRange = stateRef.current.keyRange;
        if (currentKeyRange) {
          if (note < currentKeyRange.minNote || note > currentKeyRange.maxNote) {
            return;
          }
        }

        activeKeysRef.current.set(e.code, { type: 'note', note });
        callbacksRef.current.onNoteOn(note, stateRef.current.velocity, false);
        e.preventDefault();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const activeEntry = activeKeysRef.current.get(e.code);
      if (!activeEntry) {
        return;
      }

      activeKeysRef.current.delete(e.code);
      callbacksRef.current.onNoteOff(activeEntry.note, activeEntry.type === 'pad');
      e.preventDefault();
    };

    const handleWindowBlur = () => {
      // Evitar que clics en botones o modales dentro del mismo documento cancelen las notas.
      // Solo liberamos notas si la ventana realmente perdió el foco general o está oculta.
      setTimeout(() => {
        if (!document.hasFocus() || document.hidden) {
          releaseAll();
        }
      }, 50);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        releaseAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseAll();
    };
  }, [enabled, releaseAll]);

  return {
    octaveOffset,
    setOctaveOffset,
    baseNote: QWERTY_BASE_NOTE + octaveOffset * 12,
  };
}
