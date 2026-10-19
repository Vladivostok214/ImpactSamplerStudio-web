import React, { useState, useEffect, useRef, useMemo } from 'react';
import { audioBridge } from './audio/WebAudioBridge';
import { webMidi } from './midi/WebMidiManager';
import { HardwareSkeleton } from './components/HardwareSkeleton';
import { StepSequencer } from './components/StepSequencer';
import { SoundFontInfo } from './types/soundfont';
import { FxRouting, SequencerStateInfo, StepResolution } from './types/sampler';
import { ArpStateInfo } from './types/arpeggiator';
import { useQwertyKeyboard } from './hooks/useQwertyKeyboard';
import { InstrumentSelectModal, FactoryInstrumentDef, FACTORY_INSTRUMENTS } from './components/InstrumentSelectModal';
import { SoundFontStorage } from './storage/SoundFontStorage';
import { OrientationGuard } from './components/OrientationGuard';
import { StudioAssistantAvatar } from './components/StudioAssistantAvatar';
import { setVisualKeyActive, clearAllVisualKeys } from './utils/visualKeys';
import { parseSf2Presets } from './utils/sf2Parser';
import {
  MidiLearnTarget,
  MidiLearnMapping,
  UIActionId,
  loadSavedMidiMapping,
  saveMidiMapping,
  resetSavedMidiMapping,
  getMidiNoteName,
  ACTION_LABELS,
} from './types/midiLearn';
import { Header } from './components/Header';
import { NormalizedMidiEvent } from './types/midi';
import { Loader2 } from 'lucide-react';
import '@fontsource/geist-sans';
import '@fontsource/geist-mono';

async function downloadSf2Buffer(
  downloadUrl: string,
  fileSizeMb: number,
  onProgress?: (pct: number) => void
): Promise<ArrayBuffer> {
  const proxyUrl = `/api/download?url=${encodeURIComponent(downloadUrl)}`;
  let response: Response;
  try {
    response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Proxy status: ${response.status}`);
  } catch {
    response = await fetch(downloadUrl);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = response.headers.get('content-length');
  const exactLength = contentLength ? parseInt(contentLength, 10) : 0;
  const totalBytes = exactLength > 0 ? exactLength : fileSizeMb * 1024 * 1024;
  const reader = response.body?.getReader();
  if (!reader) {
    const buf = await response.arrayBuffer();
    onProgress?.(100);
    return buf;
  }

  // Si conocemos el tamaño exacto por Content-Length, pre-asignar un único buffer contiguo (evita duplicar >500 MB en RAM)
  if (exactLength > 0) {
    const preallocated = new Uint8Array(exactLength);
    let receivedBytes = 0;
    let overflowChunks: Uint8Array[] | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        if (!overflowChunks && receivedBytes + value.length <= exactLength) {
          preallocated.set(value, receivedBytes);
        } else {
          if (!overflowChunks) {
            overflowChunks = [preallocated.subarray(0, receivedBytes)];
          }
          overflowChunks.push(value);
        }
        receivedBytes += value.length;
        const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
        onProgress?.(pct);
      }
    }

    onProgress?.(100);
    if (!overflowChunks) {
      return receivedBytes === exactLength
        ? preallocated.buffer
        : preallocated.buffer.slice(0, receivedBytes);
    }

    const full = new Uint8Array(receivedBytes);
    let off = 0;
    for (const ch of overflowChunks) {
      full.set(ch, off);
      off += ch.length;
    }
    return full.buffer;
  }

  let receivedBytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedBytes += value.length;
      const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
      onProgress?.(pct);
    }
  }
  const full = new Uint8Array(receivedBytes);
  let off = 0;
  for (const ch of chunks) {
    full.set(ch, off);
    off += ch.length;
  }
  onProgress?.(100);
  return full.buffer;
}

export const App: React.FC = () => {
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [, setIsLoadingSf2] = useState(false);

  // Estados de Hardware (Faders, Knobs, Ruedas)
  const [faders, setFaders] = useState<number[]>([64, 64, 64, 64, 64, 64, 64, 64, 100]);
  const [knobs, setKnobs] = useState<number[]>([64, 64, 0, 0, 0, 0, 0, 64]);
  const [pitchBend, setPitchBend] = useState<number>(0);
  const [modWheel, setModWheel] = useState<number>(0);
  const [fxRouting, setFxRouting] = useState<FxRouting>('off');
  const [qwertyEnabled, setQwertyEnabled] = useState<boolean>(true);

  // Estados de Modo Workstation y Secuenciador Rítmico (Bloque 4)
  const [workstationMode, setWorkstationMode] = useState<'keys' | 'seq'>('keys');
  const workstationModeRef = useRef<'keys' | 'seq'>(workstationMode);
  workstationModeRef.current = workstationMode;
  const latestStepRef = useRef<number>(0);

  const [sequencerState, setSequencerState] = useState<SequencerStateInfo>({
    isPlaying: false,
    isPaused: false,
    isRecording: false,
    bpm: 120,
    currentStep: 0,
    resolution: 'sixteenth',
    currentBank: 'a',
    isClickEnabled: false,
    selectedPad: 0,
    quantizeMode: 'sixteenth',
    quantizeStrength: 1,
    latencyCompensationTicks: 0,
    pattern: Array.from({ length: 8 }, () => new Array(32).fill(0)),
  });

  // Estados de Transporte DAW & Hardware
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const isMetronomeActiveRef = useRef(isMetronomeActive);
  isMetronomeActiveRef.current = isMetronomeActive;

  // Estados de Arpegiador y Tempo
  const [bpm, setBpm] = useState<number>(120);
  const [arpState, setArpState] = useState<ArpStateInfo>({
    enabled: false,
    hold: false,
    mode: 'up',
    rate: 'sixteenth',
    octaves: 1,
  });
  const arpStateRef = useRef(arpState);
  arpStateRef.current = arpState;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  // SoundFont Activo
  const [currentSoundfont, setCurrentSoundfont] = useState<SoundFontInfo | null>(null);
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);

  // Estados de Catálogo de Instrumentos y Persistencia IndexedDB (Bloque 5)
  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState<boolean>(false);
  const [savedSoundfonts, setSavedSoundfonts] = useState<{ id: string; displayName: string; fileSizeMb: number }[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: number }>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Splash Inicial Noir y Auto-carga de Grand Piano
  const [isBooting, setIsBooting] = useState<boolean>(() => !localStorage.getItem('impact_has_cached_instruments'));
  const [bootFadeOut, setBootFadeOut] = useState<boolean>(false);
  const [bootStatusText, setBootStatusText] = useState<string>('Iniciando motor de audio...');
  const [bootProgress, setBootProgress] = useState<number | null>(null);
  const lastMelodicSoundfontRef = useRef<SoundFontInfo | null>(null);

  // Estados de MIDI Learn y Mapeo Dinámico
  const [isMidiLearnActive, setIsMidiLearnActive] = useState<boolean>(false);
  const [selectedLearnTarget, setSelectedLearnTarget] = useState<MidiLearnTarget | null>(null);
  const [midiLearnMapping, setMidiLearnMapping] = useState<MidiLearnMapping>(loadSavedMidiMapping);
  const [lastLearnedInfo, setLastLearnedInfo] = useState<{ label: string; detail: string } | null>(null);
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const [midiEvents, setMidiEvents] = useState<NormalizedMidiEvent[]>([]);

  const learnStateRef = useRef({
    isActive: isMidiLearnActive,
    target: selectedLearnTarget,
    mapping: midiLearnMapping,
  });

  useEffect(() => {
    learnStateRef.current = {
      isActive: isMidiLearnActive,
      target: selectedLearnTarget,
      mapping: midiLearnMapping,
    };
  }, [isMidiLearnActive, selectedLearnTarget, midiLearnMapping]);

  useEffect(() => {
    if (lastLearnedInfo) {
      const timer = setTimeout(() => setLastLearnedInfo(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [lastLearnedInfo]);

  const actionHandlersRef = useRef<{ [key: string]: () => void }>({});
  const triggerUIAction = (id: UIActionId) => {
    actionHandlersRef.current[id]?.();
  };

  const handleTogglePlay = async () => {
    if (!isAudioStarted) {
      await audioBridge.initialize();
      await audioBridge.resumeAudio();
      audioBridge.syncArpState(arpState, bpm);
      setIsAudioStarted(true);
    }
    const nextPlaying = audioBridge.seqTogglePlay();
    setIsPlaying(nextPlaying);
    setSequencerState((prev) => ({
      ...prev,
      isPlaying: nextPlaying,
      isPaused: !nextPlaying,
      ...(!nextPlaying ? { isRecording: false } : {}),
    }));
    if (!nextPlaying) {
      audioBridge.noteOffAll(false);
      setIsRecording(false);
      audioBridge.seqSetRecording(false);
    }
  };

  const handleStop = () => {
    audioBridge.seqStop();
    audioBridge.seqSetRecording(false);
    setIsPlaying(false);
    setIsRecording(false);
    latestStepRef.current = 0;
    audioBridge.noteOffAll(false);
    clearAllVisualKeys();
    setSequencerState((prev) => ({ ...prev, isPlaying: false, isPaused: false, isRecording: false, currentStep: 0 }));
  };

  const handleToggleRecord = async () => {
    if (!currentSoundfont) {
      setIsInstrumentModalOpen(true);
      return;
    }
    if (!isAudioStarted) {
      await audioBridge.initialize();
      await audioBridge.resumeAudio();
      audioBridge.syncArpState(arpState, bpm);
      setIsAudioStarted(true);
    }

    const nextRecording = !isRecording;
    setIsRecording(nextRecording);
    audioBridge.seqSetRecording(nextRecording);

    setSequencerState((prev) => ({
      ...prev,
      isRecording: nextRecording,
      ...(nextRecording && !isPlaying ? { isPlaying: true, isPaused: false } : {}),
    }));

    // Si se activa grabación y el secuenciador está detenido, iniciar reproducción automáticamente
    if (nextRecording && !isPlaying) {
      const nextPlaying = audioBridge.seqTogglePlay();
      setIsPlaying(nextPlaying);
    }
  };

  const handleToggleMetronome = () => {
    setIsMetronomeActive((prev) => !prev);
  };

  const transportHandlersRef = useRef({ handleTogglePlay, handleStop, handleToggleRecord, handleToggleMetronome, handleChangeBpm: (_delta: number) => {} });
  transportHandlersRef.current = { handleTogglePlay, handleStop, handleToggleRecord, handleToggleMetronome, handleChangeBpm: (delta: number) => handleChangeBpm(delta) };

  useEffect(() => {
    // Interceptar notas si estamos aprendiendo un Pad o Acción para evitar que suenen
    webMidi.shouldInterceptNote = (_note: number, _vel: number) => {
      const { isActive, target } = learnStateRef.current;
      if (isActive && target) {
        if (target.type === 'pad' || target.type === 'action') {
          return true;
        }
      }
      return false;
    };

    // 1. Inicializar Web MIDI API
    webMidi.requestAccess();

    const unsubDevices = webMidi.onDeviceChange((devices) => {
      setMidiDevices(devices);
    });

    const unsubNotes = webMidi.onNoteEvent((note, velocity, isNoteOn) => {
      const { isActive, target, mapping } = learnStateRef.current;

      // --- MODO MIDI LEARN: CAPTURA ACTIVA DE MENSAJE NOTA ---
      if (isActive && target) {
        if (isNoteOn && velocity > 0) {
          if (target.type === 'pad') {
            const idx = target.index;
            setMidiLearnMapping((prev) => {
              const next = { ...prev, pads: { ...prev.pads, [idx]: note } };
              saveMidiMapping(next);
              return next;
            });
            setLastLearnedInfo({
              label: `Pad ${idx + 1}`,
              detail: `Asignado a Nota ${getMidiNoteName(note)} (#${note})`,
            });
            setSelectedLearnTarget(null);
            return;
          }

          if (target.type === 'action') {
            const actionId = target.id;
            setMidiLearnMapping((prev) => {
              const nextActions = { ...(prev.actions || {}) };
              for (const [k, v] of Object.entries(nextActions)) {
                if (v && v.messageType === 'note' && v.number === note) {
                  delete nextActions[k];
                }
              }
              nextActions[actionId] = { messageType: 'note', number: note };
              const next = { ...prev, actions: nextActions };
              saveMidiMapping(next);
              return next;
            });
            setLastLearnedInfo({
              label: ACTION_LABELS[actionId] || actionId,
              detail: `Asignado a Nota ${getMidiNoteName(note)} (#${note})`,
            });
            setSelectedLearnTarget(null);
            return;
          }
        }
        return;
      }

      // --- OPERACIÓN MUSICAL NORMAL ---
      if (isNoteOn && velocity > 0) {
        // 1. Verificar si la nota dispara alguna acción UI mapeada
        for (const [actId, binding] of Object.entries(mapping.actions || {})) {
          if (binding && binding.messageType === 'note' && binding.number === note) {
            triggerUIAction(actId as UIActionId);
            return;
          }
        }

        // 2. Iluminación visual de teclas de piano
        setVisualKeyActive(note, true);

        // 3. Iluminación y disparo de Pad si coincide con mapping.pads
        for (let pIdx = 0; pIdx < 8; pIdx++) {
          if (mapping.pads[pIdx] === note) {
            setActivePads((prev) => new Set([...prev, pIdx + 1]));
            break;
          }
        }
      } else {
        // Note Off
        setVisualKeyActive(note, false);

        for (let pIdx = 0; pIdx < 8; pIdx++) {
          if (mapping.pads[pIdx] === note) {
            setActivePads((prev) => {
              const next = new Set(prev);
              next.delete(pIdx + 1);
              return next;
            });
            break;
          }
        }
      }
    });

    const unsubCc = webMidi.onCcEvent((controller, value) => {
      const { isActive, target, mapping } = learnStateRef.current;

      // --- MODO MIDI LEARN: CAPTURA ACTIVA DE CONTROL CHANGE ---
      if (isActive && target) {
        if (target.type === 'fader') {
          const idx = target.index;
          setMidiLearnMapping((prev) => {
            const next = { ...prev, faders: { ...prev.faders, [idx]: controller } };
            saveMidiMapping(next);
            return next;
          });
          setLastLearnedInfo({
            label: idx === 8 ? 'Master Volume (F9)' : `Fader ${idx + 1}`,
            detail: `Asignado a CC ${controller}`,
          });
          setSelectedLearnTarget(null);
          return;
        }

        if (target.type === 'knob') {
          const idx = target.index;
          setMidiLearnMapping((prev) => {
            const next = { ...prev, knobs: { ...prev.knobs, [idx]: controller } };
            saveMidiMapping(next);
            return next;
          });
          setLastLearnedInfo({
            label: `Knob ${idx + 1}`,
            detail: `Asignado a CC ${controller}`,
          });
          setSelectedLearnTarget(null);
          return;
        }

        if (target.type === 'action') {
          const actionId = target.id;
          setMidiLearnMapping((prev) => {
            const nextActions = { ...(prev.actions || {}) };
            for (const [k, v] of Object.entries(nextActions)) {
              if (v && v.messageType === 'cc' && v.number === controller) {
                delete nextActions[k];
              }
            }
            nextActions[actionId] = { messageType: 'cc', number: controller };
            const next = { ...prev, actions: nextActions };
            saveMidiMapping(next);
            return next;
          });
          setLastLearnedInfo({
            label: ACTION_LABELS[actionId] || actionId,
            detail: `Asignado a CC ${controller}`,
          });
          setSelectedLearnTarget(null);
          return;
        }
      }

      // --- OPERACIÓN MUSICAL NORMAL ---
      // 1. Acciones mapeadas por CC
      if (value > 0) {
        for (const [actId, binding] of Object.entries(mapping.actions || {})) {
          if (binding && binding.messageType === 'cc' && binding.number === controller) {
            triggerUIAction(actId as UIActionId);
            return;
          }
        }
      }

      // 2. Mapeo dinámico de Faders (F1 a F9)
      let matchedFaderIdx: number | null = null;
      for (let fIdx = 0; fIdx < 9; fIdx++) {
        if (mapping.faders[fIdx] === controller) {
          matchedFaderIdx = fIdx;
          break;
        }
      }
      // Fallback estándar LX49+ si no está mapeado
      if (matchedFaderIdx === null) {
        if (controller >= 71 && controller <= 78) matchedFaderIdx = controller - 71;
        else if (controller >= 38 && controller <= 45) matchedFaderIdx = controller - 38;
        else if (controller === 79 || controller === 46) matchedFaderIdx = 8;
      }
      if (matchedFaderIdx !== null) {
        setFaders((prev) => {
          const next = [...prev];
          next[matchedFaderIdx!] = value;
          return next;
        });
        if (matchedFaderIdx === 8) {
          audioBridge.setMasterFader(value);
        }
        return;
      }

      // 3. Mapeo dinámico de Knobs (K1 a K8)
      let matchedKnobIdx: number | null = null;
      for (let kIdx = 0; kIdx < 8; kIdx++) {
        if (mapping.knobs[kIdx] === controller) {
          matchedKnobIdx = kIdx;
          break;
        }
      }
      // Fallback estándar LX49+
      if (matchedKnobIdx === null) {
        if (controller >= 21 && controller <= 28) matchedKnobIdx = controller - 21;
        else if (controller >= 56 && controller <= 63) matchedKnobIdx = controller - 56;
      }
      if (matchedKnobIdx !== null) {
        setKnobs((prev) => {
          const next = [...prev];
          next[matchedKnobIdx!] = value;
          return next;
        });
        audioBridge.setKnob(matchedKnobIdx, value);
        return;
      }

      // 4. Modulation Wheel (CC 1)
      if (controller === 1) {
        setModWheel(value);
        audioBridge.setModWheel(value);
      }
    });

    const unsubTransport = webMidi.onTransport((action, _value) => {
      if (action === 'play') {
        transportHandlersRef.current.handleTogglePlay();
      } else if (action === 'stop') {
        transportHandlersRef.current.handleStop();
      } else if (action === 'record') {
        transportHandlersRef.current.handleToggleRecord();
      } else if (action === 'rewind') {
        transportHandlersRef.current.handleChangeBpm(-1);
      } else if (action === 'forward') {
        transportHandlersRef.current.handleChangeBpm(1);
      } else if (action === 'click') {
        transportHandlersRef.current.handleToggleMetronome();
      }
    });

    const unsubPitch = webMidi.onPitchBend((bend) => {
      setPitchBend(bend);
      audioBridge.setPitchBend(bend);
    });

    const unsubMidiEvents = webMidi.onNormalizedMidiEvent((ev) => {
      setMidiEvents((prev) => [ev, ...prev.slice(0, 49)]);
    });

    return () => {
      webMidi.shouldInterceptNote = null;
      unsubDevices();
      unsubNotes();
      unsubCc();
      unsubTransport();
      unsubPitch();
      unsubMidiEvents();
    };
  }, []);

  // Enlace sample-accurate del metrónomo acústico y playhead del secuenciador
  useEffect(() => {
    const unsub = audioBridge.onStepChange((step) => {
      latestStepRef.current = step;

      // Solo re-renderizar por cambio de paso cuando la vista del secuenciador ('seq') está visible
      if (workstationModeRef.current === 'seq') {
        setSequencerState((prev) => (prev.currentStep !== step ? { ...prev, currentStep: step } : prev));
      }

      // En resolución de semicorcheas (16th): 4 pasos por beat (pasos 0, 4, 8, 12, 16, 20, 24, 28)
      if (step % 4 === 0 && isMetronomeActiveRef.current) {
        const isDownbeat = step === 0 || step === 16;
        audioBridge.playMetronomeClick(isDownbeat);
      }
    });

    return unsub;
  }, []);

  // Auto-activación inmediata del motor de audio ante la carga y ante cualquier primera interacción (registrado 1 sola vez)
  useEffect(() => {
    const activateAudio = async () => {
      try {
        await audioBridge.initialize();
        await audioBridge.resumeAudio();
        audioBridge.syncArpState(arpStateRef.current, bpmRef.current);
        setIsAudioStarted(true);
      } catch (err) {
        console.warn('Audio auto-activation notice:', err);
      }
    };

    // Intentar activación directa
    activateAudio();

    // Despertar ante la primera interacción (táctil, click o teclado en cualquier punto de la ventana)
    const onUserInteraction = () => {
      activateAudio();
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
    };

    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onUserInteraction);
      window.removeEventListener('keydown', onUserInteraction);
      window.removeEventListener('touchstart', onUserInteraction);
    };
  }, []);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await loadSoundFontFile(e.dataTransfer.files[0]);
    }
  };

  const finishLoadingSoundFont = async (
    id: string,
    filename: string,
    displayName: string,
    description: string,
    category: string,
    fileSizeMb: number,
    data: ArrayBuffer
  ) => {
    setIsLoadingSf2(true);
    try {
      // 1. Parsear presets y persistir en IndexedDB antes de transferir el ArrayBuffer al AudioWorklet (Zero-Copy)
      const presets = parseSf2Presets(data);

      await SoundFontStorage.save({
        id,
        filename,
        displayName,
        description,
        category,
        fileSizeMb,
        data,
        savedAt: Date.now(),
      });
      SoundFontStorage.setLastLoadedId(id);

      const list = await SoundFontStorage.list();
      setSavedSoundfonts(list);

      // 2. Transferir propiedad del ArrayBuffer al hilo del AudioWorklet sin clonar en RAM
      await audioBridge.initialize();
      await audioBridge.loadSoundFont(data, filename, true);

      const sfInfo: SoundFontInfo = {
        id,
        filename,
        displayName,
        description,
        category,
        fileSizeMb,
        presets,
      };

      // Sincronizar DSP y Arpegiador en WASM
      knobs.forEach((val, idx) => audioBridge.setKnob(idx, val));
      audioBridge.setMasterFader(faders[8]);
      audioBridge.setFxRouting(fxRouting);
      audioBridge.syncArpState(arpState, bpm);

      setCurrentSoundfont(sfInfo);
      setActivePresetIndex(0);
      setIsAudioStarted(true);

      if (filename.toLowerCase().includes('rx7')) {
        setWorkstationMode('seq');
      } else {
        setWorkstationMode('keys');
        lastMelodicSoundfontRef.current = sfInfo;
      }
    } catch (err) {
      console.error('Error cargando SoundFont:', err);
      alert('Error cargando el archivo SoundFont en WebAssembly');
    } finally {
      setIsLoadingSf2(false);
    }
  };

  // Inicialización de Almacenamiento Local IndexedDB, Auto-carga de Grand Piano y Splash Screen Inteligente
  useEffect(() => {
    let isMounted = true;
    const bootApp = async () => {
      try {
        const list = await SoundFontStorage.list();
        if (isMounted) setSavedSoundfonts(list);

        const pianoDef = FACTORY_INSTRUMENTS.find((f) => f.id === 'Piano - Realtime.sf2') || FACTORY_INSTRUMENTS[1];
        const rx7Def = FACTORY_INSTRUMENTS.find((f) => f.id === 'Yamaha_RX7_Drums.sf2') || FACTORY_INSTRUMENTS[0];

        const hasPiano = list.some((x) => x.id === pianoDef.id);
        const hasRx7 = list.some((x) => x.id === rx7Def.id);

        if (hasPiano) {
          // 1. Si Grand Piano YA está en caché: ¡ABRIR DE INMEDIATO SIN ESPERA!
          localStorage.setItem('impact_has_cached_instruments', '1');
          if (isMounted) {
            setIsBooting(false);
          }

          const lastId = SoundFontStorage.getLastLoadedId();
          const targetId = (lastId && list.some((x) => x.id === lastId)) ? lastId : pianoDef.id;
          const stored = await SoundFontStorage.get(targetId);

          if (stored && isMounted) {
            const presets = parseSf2Presets(stored.data);
            await audioBridge.initialize();
            await audioBridge.loadSoundFont(stored.data, stored.filename, true);

            // Sincronizar DSP y Arpegiador en WASM
            knobs.forEach((val, idx) => audioBridge.setKnob(idx, val));
            audioBridge.setMasterFader(faders[8]);
            audioBridge.setFxRouting(fxRouting);
            audioBridge.syncArpState(arpState, bpm);

            const sfInfo: SoundFontInfo = {
              id: stored.id,
              filename: stored.filename,
              displayName: stored.displayName,
              description: stored.description,
              category: stored.category,
              fileSizeMb: stored.fileSizeMb,
              presets,
            };
            setCurrentSoundfont(sfInfo);
            setActivePresetIndex(0);
            setIsAudioStarted(true);
            if (!stored.filename.toLowerCase().includes('rx7')) {
              lastMelodicSoundfontRef.current = sfInfo;
              setWorkstationMode('keys');
            } else {
              setWorkstationMode('seq');
            }
          }

          // Si falta RX7 por alguna razón, descargarlo silenciosamente en segundo plano
          if (!hasRx7) {
            downloadSf2Buffer(rx7Def.downloadUrl, rx7Def.fileSizeMb)
              .then(async (rx7Buf) => {
                await SoundFontStorage.save({
                  id: rx7Def.id,
                  filename: rx7Def.filename,
                  displayName: rx7Def.displayName,
                  description: rx7Def.description,
                  category: 'Factory',
                  fileSizeMb: rx7Def.fileSizeMb,
                  data: rx7Buf,
                  savedAt: Date.now(),
                });
                const updatedList = await SoundFontStorage.list();
                if (isMounted) setSavedSoundfonts(updatedList);
              })
              .catch((err) => console.warn('Error descargando RX7 en segundo plano:', err));
          }
          return;
        }

        // 2. Si NO está en caché (primera visita): mostrar Splash y descargar Grand Piano + Yamaha RX7
        if (isMounted) {
          setIsBooting(true);
          setBootFadeOut(false);
          setBootStatusText('Descargando Grand Piano...');
          setBootProgress(0);
        }

        const pianoBuf = await downloadSf2Buffer(pianoDef.downloadUrl, pianoDef.fileSizeMb, (pct) => {
          if (isMounted) setBootProgress(pct);
        });

        if (isMounted) {
          setBootStatusText('Iniciando Grand Piano...');
          await finishLoadingSoundFont(
            pianoDef.id,
            pianoDef.filename,
            pianoDef.displayName,
            pianoDef.description,
            'Factory',
            pianoDef.fileSizeMb,
            pianoBuf
          );
        }

        // Descarga de Yamaha RX7 (solo 19.3 MB) para tener la percusión lista desde el inicio
        if (isMounted) {
          setBootStatusText('Descargando Batería Yamaha RX7...');
          setBootProgress(0);
        }

        const rx7Buf = await downloadSf2Buffer(rx7Def.downloadUrl, rx7Def.fileSizeMb, (pct) => {
          if (isMounted) setBootProgress(pct);
        });

        await SoundFontStorage.save({
          id: rx7Def.id,
          filename: rx7Def.filename,
          displayName: rx7Def.displayName,
          description: rx7Def.description,
          category: 'Factory',
          fileSizeMb: rx7Def.fileSizeMb,
          data: rx7Buf,
          savedAt: Date.now(),
        });

        localStorage.setItem('impact_has_cached_instruments', '1');
        const finalList = await SoundFontStorage.list();
        if (isMounted) {
          setSavedSoundfonts(finalList);
          setBootStatusText('¡Listo!');
          setBootProgress(100);
          setBootFadeOut(true);
          setTimeout(() => {
            if (isMounted) setIsBooting(false);
          }, 500);
        }
      } catch (err) {
        console.warn('Error inicializando inicio de app:', err);
        if (isMounted) setIsBooting(false);
      }
    };

    bootApp();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadSoundFontFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.sf2')) {
      alert('Por favor selecciona un archivo con extensión .sf2');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      await finishLoadingSoundFont(
        file.name,
        file.name,
        file.name.replace(/\.[^/.]+$/, ''),
        'SoundFont importado por el usuario',
        'Custom',
        Math.round((file.size / (1024 * 1024)) * 10) / 10,
        buffer
      );
    } catch (err) {
      console.error('Error leyendo archivo SoundFont:', err);
      alert('No se pudo leer el archivo SoundFont seleccionado.');
    }
  };

  const handleDownloadFactory = async (instrument: FactoryInstrumentDef) => {
    try {
      setDownloadingId(instrument.id);
      setDownloadProgress((prev) => ({ ...prev, [instrument.id]: 0 }));

      const buffer = await downloadSf2Buffer(instrument.downloadUrl, instrument.fileSizeMb, (pct) => {
        setDownloadProgress((prev) => ({ ...prev, [instrument.id]: pct }));
      });

      await finishLoadingSoundFont(
        instrument.id,
        instrument.filename,
        instrument.displayName,
        instrument.description,
        'Factory',
        instrument.fileSizeMb,
        buffer
      );
    } catch (err) {
      console.error('Error descargando instrumento de fábrica:', err);
      alert(`No se pudo descargar ${instrument.displayName}. Revisa tu conexión a internet.`);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSelectStored = async (id: string) => {
    try {
      setIsLoadingSf2(true);
      const entry = await SoundFontStorage.get(id);
      if (!entry) {
        alert('El instrumento no se encontró en el almacenamiento local.');
        return;
      }

      const presets = parseSf2Presets(entry.data);
      await audioBridge.initialize();
      await audioBridge.loadSoundFont(entry.data, entry.filename, true);

      SoundFontStorage.setLastLoadedId(id);

      const sfInfo: SoundFontInfo = {
        id: entry.id,
        filename: entry.filename,
        displayName: entry.displayName,
        description: entry.description,
        category: entry.category,
        fileSizeMb: entry.fileSizeMb,
        presets,
      };

      knobs.forEach((val, idx) => audioBridge.setKnob(idx, val));
      audioBridge.setMasterFader(faders[8]);
      audioBridge.setFxRouting(fxRouting);
      audioBridge.syncArpState(arpState, bpm);

      setCurrentSoundfont(sfInfo);
      setActivePresetIndex(0);
      setIsAudioStarted(true);

      if (entry.filename.toLowerCase().includes('rx7')) {
        setWorkstationMode('seq');
      } else {
        setWorkstationMode('keys');
        lastMelodicSoundfontRef.current = sfInfo;
      }
    } catch (err) {
      console.error('Error cargando SoundFont guardado:', err);
      alert('Error cargando el instrumento desde el almacenamiento local.');
    } finally {
      setIsLoadingSf2(false);
    }
  };

  const handleDeleteStored = async (id: string) => {
    try {
      await SoundFontStorage.delete(id);
      const list = await SoundFontStorage.list();
      setSavedSoundfonts(list);
      if (list.length === 0) {
        localStorage.removeItem('impact_has_cached_instruments');
      }
      if (SoundFontStorage.getLastLoadedId() === id) {
        SoundFontStorage.setLastLoadedId('');
      }
    } catch (err) {
      console.error('Error eliminando SoundFont:', err);
    }
  };

  // Lista unificada de todos los instrumentos (Fábrica + Usuario) para el selector OLED
  const availableSoundfonts: SoundFontInfo[] = useMemo(() => {
    const factoryOrder = ['piano', 'rhodes', 'mellotron', 'rx7'];
    const factorySfs: SoundFontInfo[] = FACTORY_INSTRUMENTS.map((f) => {
      if (currentSoundfont && (currentSoundfont.id === f.id || currentSoundfont.filename === f.filename)) {
        return currentSoundfont;
      }
      return {
        id: f.id,
        filename: f.filename,
        displayName: f.displayName,
        description: f.description,
        category: 'Factory',
        fileSizeMb: f.fileSizeMb,
        presets: [],
        isUser: false,
      };
    }).sort((a, b) => {
      const idxA = factoryOrder.findIndex((k) => a.filename.toLowerCase().includes(k));
      const idxB = factoryOrder.findIndex((k) => b.filename.toLowerCase().includes(k));
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const userSfs: SoundFontInfo[] = savedSoundfonts
      .filter((s) => !FACTORY_INSTRUMENTS.some((f) => f.id === s.id || f.filename === s.id))
      .map((s) => {
        if (currentSoundfont && currentSoundfont.id === s.id) {
          return currentSoundfont;
        }
        return {
          id: s.id,
          filename: s.id,
          displayName: s.displayName,
          description: 'Instrumento importado',
          category: 'User',
          fileSizeMb: s.fileSizeMb,
          presets: [],
          isUser: true,
        };
      });

    return [...factorySfs, ...userSfs];
  }, [currentSoundfont, savedSoundfonts]);

  const handleSelectSoundfont = async (idOrFilename: string) => {
    // 1. Si ya está descargado y en caché local IndexedDB
    const stored = savedSoundfonts.find(
      (s) =>
        s.id === idOrFilename ||
        s.id.toLowerCase() === idOrFilename.toLowerCase() ||
        (idOrFilename.toLowerCase().includes('rhodes') && s.id.toLowerCase().includes('rhodes'))
    );
    if (stored) {
      await handleSelectStored(stored.id);
      return;
    }

    // 2. Si es un instrumento de fábrica no descargado aún
    const factoryDef = FACTORY_INSTRUMENTS.find(
      (f) =>
        f.id === idOrFilename ||
        f.filename === idOrFilename ||
        f.id.toLowerCase() === idOrFilename.toLowerCase() ||
        (idOrFilename.toLowerCase().includes('rhodes') && f.id.toLowerCase().includes('rhodes'))
    );
    if (factoryDef) {
      await handleDownloadFactory(factoryDef);
      return;
    }

    // 3. Fallback directo a almacenamiento
    await handleSelectStored(idOrFilename);
  };

  const handleChangeWorkstationMode = async (newMode: 'keys' | 'seq') => {
    if (newMode === workstationMode) return;
    workstationModeRef.current = newMode;
    setWorkstationMode(newMode);

    if (newMode === 'seq') {
      setSequencerState((prev) => ({ ...prev, currentStep: latestStepRef.current }));
      // Si entramos a SEQ y no tenemos RX7 activo, recordar melódico y cargar RX7
      if (!currentSoundfont?.filename.toLowerCase().includes('rx7')) {
        if (currentSoundfont) {
          lastMelodicSoundfontRef.current = currentSoundfont;
        }
        const rx7Entry = await SoundFontStorage.get('Yamaha_RX7_Drums.sf2');
        if (rx7Entry) {
          const presets = parseSf2Presets(rx7Entry.data);
          await audioBridge.loadSoundFont(rx7Entry.data, rx7Entry.filename, true);
          const sfInfo: SoundFontInfo = {
            id: rx7Entry.id,
            filename: rx7Entry.filename,
            displayName: rx7Entry.displayName,
            description: rx7Entry.description,
            category: rx7Entry.category,
            fileSizeMb: rx7Entry.fileSizeMb,
            presets,
          };
          setCurrentSoundfont(sfInfo);
          setActivePresetIndex(0);
        }
      }
    } else if (newMode === 'keys') {
      // Si volvemos a KEYS y teníamos RX7 activo, restaurar el instrumento melódico previo
      if (currentSoundfont?.filename.toLowerCase().includes('rx7')) {
        const targetId = lastMelodicSoundfontRef.current?.id || 'Piano - Realtime.sf2';
        const stored = await SoundFontStorage.get(targetId);
        if (stored) {
          const presets = parseSf2Presets(stored.data);
          await audioBridge.loadSoundFont(stored.data, stored.filename, true);
          const sfInfo: SoundFontInfo = {
            id: stored.id,
            filename: stored.filename,
            displayName: stored.displayName,
            description: stored.description,
            category: stored.category,
            fileSizeMb: stored.fileSizeMb,
            presets,
          };
          setCurrentSoundfont(sfInfo);
          setActivePresetIndex(0);
        }
      }
    }
  };

  const handleTriggerNote = (note: number, velocity: number) => {
    if (!currentSoundfont) {
      setIsInstrumentModalOpen(true);
      return;
    }
    if (!isAudioStarted) {
      audioBridge.resumeAudio();
      setIsAudioStarted(true);
    }
    audioBridge.noteOn(note, velocity);
    setVisualKeyActive(note, true);
  };

  const handleReleaseNote = (note: number) => {
    audioBridge.noteOff(note);
    setVisualKeyActive(note, false);
  };

  const handleSelectPreset = (patch: number, index: number, bank: number = 0) => {
    setActivePresetIndex(index);
    audioBridge.setProgram(patch, bank);
  };

  const handleQwertyNoteOn = async (note: number, velocity: number) => {
    if (!currentSoundfont) {
      setIsInstrumentModalOpen(true);
      return;
    }

    if (!isAudioStarted) {
      await audioBridge.initialize();
      await audioBridge.resumeAudio();
      audioBridge.syncArpState(arpState, bpm);
      setIsAudioStarted(true);
    }
    audioBridge.noteOn(note, velocity);
    setVisualKeyActive(note, true);
  };

  const handleQwertyNoteOff = (note: number) => {
    audioBridge.noteOff(note);
    setVisualKeyActive(note, false);
  };

  const { octaveOffset } = useQwertyKeyboard({
    enabled: qwertyEnabled,
    onNoteOn: handleQwertyNoteOn,
    onNoteOff: handleQwertyNoteOff,
    onTogglePlay: handleTogglePlay,
    onStop: handleStop,
  });

  const handleChangeFader = (index: number, value: number) => {
    setFaders((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    if (index === 8) {
      audioBridge.setMasterFader(value);
    }
  };

  const handleHeaderMasterGainChange = (gain: number) => {
    const intVal = Math.max(0, Math.min(127, Math.round(gain * 127)));
    handleChangeFader(8, intVal);
  };

  const handleChangeKnob = (index: number, value: number) => {
    setKnobs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    audioBridge.setKnob(index, value);
  };

  const handleChangePitchBend = (bend: number) => {
    setPitchBend(bend);
    audioBridge.setPitchBend(bend);
  };

  const handleChangeModWheel = (val: number) => {
    setModWheel(val);
    audioBridge.setModWheel(val);
  };

  const handleChangeFxRouting = (routing: FxRouting) => {
    setFxRouting(routing);
    audioBridge.setFxRouting(routing);
  };

  const handleChangeArpState = (nextState: ArpStateInfo) => {
    setArpState(nextState);
    audioBridge.syncArpState(nextState, bpm);
  };

  const handleChangeBpm = (delta: number) => {
    const nextBpm = Math.max(40, Math.min(260, bpm + delta));
    setBpm(nextBpm);
    audioBridge.setBpm(nextBpm);
    setSequencerState((prev) => ({ ...prev, bpm: nextBpm }));
  };

  const handleSetBpm = (val: number) => {
    const nextBpm = Math.max(40, Math.min(260, Math.round(val)));
    setBpm(nextBpm);
    audioBridge.setBpm(nextBpm);
    setSequencerState((prev) => ({ ...prev, bpm: nextBpm }));
  };

  // Sincronización reactiva del patrón cuando se graba en vivo desde el hilo de audio
  useEffect(() => {
    const unsub = audioBridge.onPatternChange((newPattern) => {
      setSequencerState((prev) => ({ ...prev, pattern: newPattern }));
    });
    return unsub;
  }, []);

  const handleSequencerToggleStep = (padIdx: number, stepIdx: number) => {
    audioBridge.seqToggleStep(padIdx, stepIdx);
    const updatedPattern = audioBridge.seqGetPattern();
    setSequencerState((prev) => ({ ...prev, pattern: updatedPattern }));
  };

  const handleSequencerClearTrack = (padIdx: number) => {
    audioBridge.seqClearTrack(padIdx);
    const updatedPattern = audioBridge.seqGetPattern();
    setSequencerState((prev) => ({ ...prev, pattern: updatedPattern }));
  };

  const handleSequencerClearAll = () => {
    audioBridge.seqClearAll();
    const updatedPattern = audioBridge.seqGetPattern();
    setSequencerState((prev) => ({ ...prev, pattern: updatedPattern }));
  };

  const handleSequencerUndo = () => {
    if (audioBridge.seqUndo()) {
      const updatedPattern = audioBridge.seqGetPattern();
      setSequencerState((prev) => ({ ...prev, pattern: updatedPattern }));
    }
  };

  const handleSequencerChangeResolution = (res: StepResolution) => {
    audioBridge.seqSetResolution(res);
    setSequencerState((prev) => ({ ...prev, resolution: res }));
  };

  const handleSequencerToggleBank = () => {
    const nextBank = audioBridge.seqToggleBank() as 'a' | 'b';
    const updatedPattern = audioBridge.seqGetPattern();
    setSequencerState((prev) => ({ ...prev, currentBank: nextBank, pattern: updatedPattern }));
  };

  const handleSequencerTriggerPad = (padIdx: number) => {
    const drumNotes = [36, 38, 42, 46, 41, 45, 49, 51];
    const note = midiLearnMapping.pads[padIdx] ?? drumNotes[padIdx] ?? 36;
    setActivePads((prev) => new Set([...prev, padIdx + 1]));
    setTimeout(() => {
      setActivePads((prev) => {
        const next = new Set(prev);
        next.delete(padIdx + 1);
        return next;
      });
    }, 120);
    handleTriggerNote(note, 127);
    setTimeout(() => handleReleaseNote(note), 120);
  };

  const tapTimesRef = useRef<number[]>([]);
  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 2500);
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgMs > 100) {
        const calculatedBpm = Math.round(60000 / avgMs);
        const clampedBpm = Math.max(40, Math.min(260, calculatedBpm));
        setBpm(clampedBpm);
        audioBridge.setBpm(clampedBpm);
        setSequencerState((prev) => ({ ...prev, bpm: clampedBpm }));
      }
    }
  };

  useEffect(() => {
    actionHandlersRef.current = {
      play: handleTogglePlay,
      stop: handleStop,
      record: handleToggleRecord,
      click: handleToggleMetronome,
      visualMetronome: () => {},
      tapTempo: handleTapTempo,
      bpmDown: () => handleChangeBpm(-1),
      bpmUp: () => handleChangeBpm(1),
      bank: handleSequencerToggleBank,
      grid: () => {
        const nextRes = sequencerState.resolution === 'eighth' ? 'sixteenth' : sequencerState.resolution === 'sixteenth' ? 'thirtySecond' : 'eighth';
        handleSequencerChangeResolution(nextRes);
      },
      page: () => {},
      undo: handleSequencerUndo,
      clearTrack: () => handleSequencerClearTrack(0),
      clearPattern: handleSequencerClearAll,
      workstationMode: () => handleChangeWorkstationMode(workstationMode === 'keys' ? 'seq' : 'keys'),
      fxRouteKeys: () => handleChangeFxRouting(fxRouting === 'keys' ? 'off' : 'keys'),
      fxRoutePads: () => handleChangeFxRouting(fxRouting === 'pads' ? 'off' : 'pads'),
      toggleArp: () => setArpState((prev) => ({ ...prev, enabled: !prev.enabled })),
      toggleArpHold: () => setArpState((prev) => ({ ...prev, hold: !prev.hold })),
    };
  });

  // Iluminación ambiental reactiva al instrumento seleccionado
  const getAmbientGlow = () => {
    const fn = currentSoundfont?.filename.toLowerCase() || '';
    if (fn.includes('piano') && !fn.includes('rhodes')) {
      return 'radial-gradient(ellipse 85% 65% at 50% 45%, rgba(245, 158, 11, 0.20) 0%, rgba(245, 158, 11, 0.07) 45%, transparent 75%)';
    } else if (fn.includes('rhodes')) {
      return 'radial-gradient(ellipse 85% 65% at 50% 45%, rgba(6, 182, 212, 0.20) 0%, rgba(6, 182, 212, 0.07) 45%, transparent 75%)';
    } else if (fn.includes('mellotron')) {
      return 'radial-gradient(ellipse 85% 65% at 50% 45%, rgba(244, 63, 94, 0.20) 0%, rgba(244, 63, 94, 0.07) 45%, transparent 75%)';
    } else if (fn.includes('rx7')) {
      return 'radial-gradient(ellipse 85% 65% at 50% 45%, rgba(168, 85, 247, 0.22) 0%, rgba(168, 85, 247, 0.08) 45%, transparent 75%)';
    }
    return 'radial-gradient(ellipse 85% 65% at 50% 45%, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.05) 45%, transparent 75%)';
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className="min-h-screen w-screen flex flex-col bg-[#050507] text-slate-100 select-none overflow-x-hidden font-sans relative"
    >
      {/* Capas de Fondo de Estudio Noir (Spotlight + Micro-Malla + Aura Reactiva + Viñeta) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 1. Iluminación Cenital Definida (Studio Overhead Spotlight) */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 50%, transparent 75%)',
          }}
        />

        {/* 2. Micro-Malla Acústica de Estudio (Precision Dot Matrix) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.22) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 85% 75% at 50% 50%, black 40%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 75% at 50% 50%, black 40%, transparent 95%)',
          }}
        />

        {/* 3. Aura Reactiva al Instrumento Activo */}
        <div
          className="absolute inset-0 transition-all duration-1000 ease-out"
          style={{
            background: getAmbientGlow(),
          }}
        />

        {/* 4. Viñeta Perimetral Profunda */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 95% 85% at 50% 50%, transparent 65%, rgba(0, 0, 0, 0.85) 100%)',
          }}
        />
      </div>

      {/* Header Modular Noir-Tech (Márgenes sincronizados con la consola) */}
      <Header
        onOpenInstrumentSelect={() => setIsInstrumentModalOpen(true)}
        currentSoundfont={currentSoundfont}
        midiEvents={midiEvents}
        onClearMidiEvents={() => setMidiEvents([])}
        midiDevices={midiDevices}
        isAudioStarted={isAudioStarted}
        audioSampleRate={audioBridge.getAudioContext()?.sampleRate || 48000}
        audioLatencyMs={(audioBridge.getAudioContext()?.baseLatency || 0.005) * 1000}
        masterGain={faders[8] / 127}
        onMasterGainChange={handleHeaderMasterGainChange}
        isMidiLearnActive={isMidiLearnActive}
        onToggleMidiLearn={() => {
          setIsMidiLearnActive((prev) => !prev);
          setSelectedLearnTarget(null);
        }}
        qwertyEnabled={qwertyEnabled}
        onToggleQwerty={() => setQwertyEnabled((prev) => !prev)}
      />

      {/* Barra Superior Informativa de Modo MIDI Learn */}
      {isMidiLearnActive && (
        <div className="w-full bg-[#18130a] border-b border-amber-500/40 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 z-30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping shrink-0" />
            <span className="text-amber-300 font-bold uppercase tracking-wider shrink-0">MODO MIDI LEARN ACTIVO:</span>
            {selectedLearnTarget ? (
              <span className="text-amber-100 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded animate-pulse">
                Mueve una perilla/fader o pulsa una tecla/pad en tu controlador para asignar: <strong>
                  {selectedLearnTarget.type === 'fader' ? (selectedLearnTarget.index === 8 ? 'Master Volume (F9)' : `Fader ${selectedLearnTarget.index + 1}`) :
                   selectedLearnTarget.type === 'knob' ? `Knob ${selectedLearnTarget.index + 1}` :
                   selectedLearnTarget.type === 'pad' ? `Pad ${selectedLearnTarget.index + 1}` :
                   ACTION_LABELS[selectedLearnTarget.id] || selectedLearnTarget.id}
                </strong>
              </span>
            ) : (
              <span className="text-zinc-300">
                Haz clic en cualquier control (Faders, Knobs, Pads o Transporte) para aprender su mapeo.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const def = resetSavedMidiMapping();
                setMidiLearnMapping(def);
                setLastLearnedInfo({ label: 'Mapeos Restablecidos', detail: 'Valores por defecto aplicados' });
              }}
              className="text-[10px] font-mono text-zinc-400 hover:text-rose-300 px-2 py-0.5 rounded bg-black/40 border border-white/10 transition cursor-pointer"
            >
              Restablecer Mapeos
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMidiLearnActive(false);
                setSelectedLearnTarget(null);
              }}
              className="text-[10px] font-mono text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 transition font-bold cursor-pointer"
            >
              Salir (Listo)
            </button>
          </div>
        </div>
      )}

      {/* Contenido Principal: Consola Flotante Centrada Ergonómicamente */}
      <main className="flex-1 p-2 sm:py-3 sm:px-4 flex flex-col justify-center items-center relative z-10 my-auto">
        <div className="studio-console flex flex-col w-full max-w-6xl my-auto transition-all duration-200">
          <HardwareSkeleton
            faders={faders}
            knobs={knobs}
            pitchBend={pitchBend}
            modWheel={modWheel}
            availableSoundfonts={availableSoundfonts}
            currentSoundfont={currentSoundfont}
            activePresetIndex={activePresetIndex}
            onSelectSoundfont={handleSelectSoundfont}
            onSelectPreset={handleSelectPreset}
            isDownloading={!!downloadingId}
            downloadProgress={downloadingId ? (downloadProgress[downloadingId] ?? 0) : null}
            fxRouting={fxRouting}
            onChangeFxRouting={handleChangeFxRouting}
            arpState={arpState}
            onChangeArpState={handleChangeArpState}
            isMidiLearnActive={isMidiLearnActive}
            selectedLearnTarget={selectedLearnTarget}
            onSelectLearnTarget={setSelectedLearnTarget}
            midiLearnMapping={midiLearnMapping}
            onTriggerNote={handleTriggerNote}
            onReleaseNote={handleReleaseNote}
            onChangeFader={handleChangeFader}
            onChangeKnob={handleChangeKnob}
            onChangePitchBend={handleChangePitchBend}
            onChangeModWheel={handleChangeModWheel}
            hideKeyboard={workstationMode === 'seq'}
            qwertyEnabled={qwertyEnabled}
            qwertyOctaveOffset={octaveOffset}
          >
            <StepSequencer
              viewMode={workstationMode}
              onChangeViewMode={handleChangeWorkstationMode}
              sequencerState={sequencerState}
              activePads={activePads}
              isMidiLearnActive={isMidiLearnActive}
              selectedLearnTarget={selectedLearnTarget}
              onSelectLearnTarget={setSelectedLearnTarget}
              midiLearnMapping={midiLearnMapping}
              onTriggerPad={handleSequencerTriggerPad}
              onTogglePlay={handleTogglePlay}
              onStop={handleStop}
              onToggleRecord={handleToggleRecord}
              bpm={bpm}
              onSetBpm={handleSetBpm}
              onAdjustBpm={handleChangeBpm}
              onTapTempo={handleTapTempo}
              onToggleStep={handleSequencerToggleStep}
              onClearTrack={handleSequencerClearTrack}
              onClearAll={handleSequencerClearAll}
              onChangeResolution={handleSequencerChangeResolution}
              onToggleBank={handleSequencerToggleBank}
              onUndo={handleSequencerUndo}
              isClickEnabled={isMetronomeActive}
              onToggleClick={handleToggleMetronome}
              quantizeMode={sequencerState.quantizeMode}
              quantizeStrength={sequencerState.quantizeStrength}
              onSetQuantizeMode={(mode) => setSequencerState((prev) => ({ ...prev, quantizeMode: mode }))}
              onSetQuantizeStrength={(str) => setSequencerState((prev) => ({ ...prev, quantizeStrength: str }))}
            />
          </HardwareSkeleton>
        </div>
      </main>



      {/* Asistente Flotante con Ojos Vivos y Base de Datos FAQ */}
      <StudioAssistantAvatar
        onOpenSequencer={() => handleChangeWorkstationMode('seq')}
        onOpenKeys={() => handleChangeWorkstationMode('keys')}
        onOpenInstruments={() => setIsInstrumentModalOpen(true)}
        onToggleMetronome={handleToggleMetronome}
      />

      {/* Modal de Catálogo Fotográfico de Instrumentos (Bloque 5) */}
      <InstrumentSelectModal
        isOpen={isInstrumentModalOpen}
        onClose={() => setIsInstrumentModalOpen(false)}
        currentSoundfont={currentSoundfont}
        savedSoundfonts={savedSoundfonts}
        onSelectStored={handleSelectStored}
        onDownloadFactory={handleDownloadFactory}
        onImportFile={loadSoundFontFile}
        onDeleteStored={handleDeleteStored}
        downloadProgress={downloadProgress}
        downloadingId={downloadingId}
      />

      {/* Splash Inicial Noir con Revelado Cinematográfico */}
      {isBooting && (
        <div
          className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center select-none transition-all duration-700 ease-out ${
            bootFadeOut
              ? 'opacity-0 pointer-events-none scale-110 blur-sm'
              : 'opacity-100 scale-100 blur-0'
          }`}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-widest text-white flex items-center drop-shadow-[0_0_35px_rgba(255,255,255,0.18)]">
            IMPACT<span className="text-emerald-400 drop-shadow-[0_0_24px_rgba(16,185,129,0.75)]">SAMPLER</span>
          </h1>

          <p className="mt-4 text-xs font-mono text-zinc-400 tracking-wider flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>{bootStatusText}</span>
          </p>

          {bootProgress !== null && (
            <div className="w-56 sm:w-72 flex flex-col items-center mt-3">
              <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-emerald-400 shadow-[0_0_8px_#10b981] transition-all duration-150"
                  style={{ width: `${bootProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-500 mt-1">{bootProgress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Toast Flotante de Confirmación de Aprendizaje */}
      {lastLearnedInfo && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12141a] border border-amber-500/60 shadow-[0_4px_24px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.35)] rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">{lastLearnedInfo.label}</span>
            <span className="text-[11px] font-mono text-zinc-300">{lastLearnedInfo.detail}</span>
          </div>
        </div>
      )}

      {/* Guardia de Orientación Móvil (Rotate Device Overlay) */}
      <OrientationGuard />
    </div>
  );
};
