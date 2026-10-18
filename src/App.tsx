import React, { useState, useEffect, useRef } from 'react';
import { audioBridge } from './audio/WebAudioBridge';
import { webMidi } from './midi/WebMidiManager';
import { HardwareSkeleton } from './components/HardwareSkeleton';
import { StepSequencer } from './components/StepSequencer';
import { SoundFontInfo } from './types/soundfont';
import { FxRouting, SequencerStateInfo, StepResolution } from './types/sampler';
import { ArpStateInfo } from './types/arpeggiator';
import { useQwertyKeyboard, MIN_OCTAVE_OFFSET, MAX_OCTAVE_OFFSET } from './hooks/useQwertyKeyboard';
import { InstrumentSelectModal, FactoryInstrumentDef } from './components/InstrumentSelectModal';
import { SoundFontStorage } from './storage/SoundFontStorage';
import { OrientationGuard } from './components/OrientationGuard';
import { setVisualKeyActive, clearAllVisualKeys } from './utils/visualKeys';
import { Activity, Upload, Music, Volume2, Loader2, Keyboard, Play, Square, Circle, Bell } from 'lucide-react';
import '@fontsource/geist-sans';
import '@fontsource/geist-mono';

export const App: React.FC = () => {
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [midiDevices, setMidiDevices] = useState<string[]>([]);
  const [isLoadingSf2, setIsLoadingSf2] = useState(false);

  // Estados de Hardware (Faders, Knobs, Ruedas)
  const [faders, setFaders] = useState<number[]>([64, 64, 64, 64, 64, 64, 64, 64, 100]);
  const [knobs, setKnobs] = useState<number[]>([64, 64, 0, 0, 0, 0, 0, 64]);
  const [pitchBend, setPitchBend] = useState<number>(0);
  const [modWheel, setModWheel] = useState<number>(0);
  const [fxRouting, setFxRouting] = useState<FxRouting>('both');
  const [qwertyEnabled, setQwertyEnabled] = useState<boolean>(true);

  // Estados de Modo Workstation y Secuenciador Rítmico (Bloque 4)
  const [workstationMode, setWorkstationMode] = useState<'keys' | 'seq'>('keys');
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
  const [currentBeat, setCurrentBeat] = useState<number>(0);

  // Estados de Arpegiador y Tempo
  const [bpm, setBpm] = useState<number>(120);
  const [arpState, setArpState] = useState<ArpStateInfo>({
    enabled: false,
    hold: false,
    mode: 'up',
    rate: 'sixteenth',
    octaves: 1,
  });

  // SoundFont Activo
  const [currentSoundfont, setCurrentSoundfont] = useState<SoundFontInfo | null>(null);
  const [activePresetIndex, setActivePresetIndex] = useState<number>(0);

  // Estados de Catálogo de Instrumentos y Persistencia IndexedDB (Bloque 5)
  const [isInstrumentModalOpen, setIsInstrumentModalOpen] = useState<boolean>(false);
  const [savedSoundfonts, setSavedSoundfonts] = useState<{ id: string; displayName: string; fileSizeMb: number }[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: number }>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleTogglePlay = async () => {
    if (!isAudioStarted) {
      await audioBridge.initialize();
      await audioBridge.resumeAudio();
      audioBridge.syncArpState(arpState, bpm);
      setIsAudioStarted(true);
    }
    const nextPlaying = audioBridge.seqTogglePlay();
    setIsPlaying(nextPlaying);
    setSequencerState((prev) => ({ ...prev, isPlaying: nextPlaying, isPaused: !nextPlaying }));
    if (!nextPlaying) {
      audioBridge.noteOffAll(false);
      setIsRecording(false);
    }
  };

  const handleStop = () => {
    audioBridge.seqStop();
    setIsPlaying(false);
    setIsRecording(false);
    setCurrentBeat(0);
    audioBridge.noteOffAll(false);
    clearAllVisualKeys();
    setSequencerState((prev) => ({ ...prev, isPlaying: false, isPaused: false, currentStep: 0 }));
  };

  const handleToggleRecord = () => {
    setIsRecording((prev) => !prev);
  };

  const handleToggleMetronome = () => {
    setIsMetronomeActive((prev) => !prev);
  };

  const transportHandlersRef = useRef({ handleTogglePlay, handleStop, handleToggleRecord, handleToggleMetronome, handleChangeBpm: (_delta: number) => {} });
  transportHandlersRef.current = { handleTogglePlay, handleStop, handleToggleRecord, handleToggleMetronome, handleChangeBpm: (delta: number) => handleChangeBpm(delta) };

  useEffect(() => {
    // 1. Inicializar Web MIDI API
    webMidi.requestAccess();

    const unsubDevices = webMidi.onDeviceChange((devices) => {
      setMidiDevices(devices);
    });

    const unsubNotes = webMidi.onNoteEvent((note, _velocity, isNoteOn) => {
      setVisualKeyActive(note, isNoteOn);
    });

    const unsubCc = webMidi.onCcEvent((controller, value) => {
      // Mapeo Nektar LX49+ Preset Estándar: Faders (CC 71-78 o CC 38-45)
      if (controller >= 71 && controller <= 78) {
        const idx = controller - 71;
        setFaders((prev) => {
          const next = [...prev];
          next[idx] = value;
          return next;
        });
      } else if (controller >= 38 && controller <= 45) {
        const idx = controller - 38;
        setFaders((prev) => {
          const next = [...prev];
          next[idx] = value;
          return next;
        });
      } else if (controller === 79 || controller === 46) {
        // Master Fader (F9)
        setFaders((prev) => {
          const next = [...prev];
          next[8] = value;
          return next;
        });
        audioBridge.setMasterFader(value);
      }
      // Knobs (CC 21-28 o CC 56-63)
      else if (controller >= 21 && controller <= 28) {
        const idx = controller - 21;
        setKnobs((prev) => {
          const next = [...prev];
          next[idx] = value;
          return next;
        });
        audioBridge.setKnob(idx, value);
      } else if (controller >= 56 && controller <= 63) {
        const idx = controller - 56;
        setKnobs((prev) => {
          const next = [...prev];
          next[idx] = value;
          return next;
        });
        audioBridge.setKnob(idx, value);
      }
      // Mod Wheel (CC 1)
      else if (controller === 1) {
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

    return () => {
      unsubDevices();
      unsubNotes();
      unsubCc();
      unsubTransport();
      unsubPitch();
    };
  }, []);

  // Reloj Acústico del Metrónomo y Beat Tracker (1, 2, 3, 4)
  useEffect(() => {
    if (!isPlaying) {
      setCurrentBeat(0);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;
    if (isMetronomeActive) {
      audioBridge.playMetronomeClick(true);
    }

    let beat = 0;
    const timer = setInterval(() => {
      beat = (beat + 1) % 4;
      setCurrentBeat(beat);
      if (isMetronomeActive) {
        audioBridge.playMetronomeClick(beat === 0);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, bpm, isMetronomeActive]);

  const handleStartAudio = async () => {
    await audioBridge.initialize();
    await audioBridge.resumeAudio();
    audioBridge.syncArpState(arpState, bpm);
    setIsAudioStarted(true);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await loadSoundFontFile(e.dataTransfer.files[0]);
    }
  };

  // Inicialización de Almacenamiento Local IndexedDB y Auto-carga (Bloque 5)
  useEffect(() => {
    let isMounted = true;
    const initSoundFontStorage = async () => {
      try {
        const list = await SoundFontStorage.list();
        if (!isMounted) return;
        setSavedSoundfonts(list);

        const lastId = SoundFontStorage.getLastLoadedId();
        if (lastId) {
          const entry = await SoundFontStorage.get(lastId);
          if (entry && isMounted) {
            setIsLoadingSf2(true);
            await audioBridge.initialize();
            await audioBridge.loadSoundFont(entry.data, entry.filename);

            const sfInfo: SoundFontInfo = {
              id: entry.id,
              filename: entry.filename,
              displayName: entry.displayName,
              description: entry.description,
              category: entry.category,
              fileSizeMb: entry.fileSizeMb,
              presets: [{ index: 0, name: 'Default Patch', bank: 0, patch: 0 }],
            };
            if (isMounted) {
              setCurrentSoundfont(sfInfo);
            }
          }
        }
      } catch (err) {
        console.warn('Error inicializando almacenamiento local de SoundFonts:', err);
      } finally {
        if (isMounted) setIsLoadingSf2(false);
      }
    };

    initSoundFontStorage();
    return () => {
      isMounted = false;
    };
  }, []);

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
      await audioBridge.initialize();
      await audioBridge.loadSoundFont(data, filename);

      // Persistir en IndexedDB
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

      const sfInfo: SoundFontInfo = {
        id,
        filename,
        displayName,
        description,
        category,
        fileSizeMb,
        presets: [{ index: 0, name: 'Default Patch', bank: 0, patch: 0 }],
      };

      // Sincronizar DSP y Arpegiador en WASM
      knobs.forEach((val, idx) => audioBridge.setKnob(idx, val));
      audioBridge.setMasterFader(faders[8]);
      audioBridge.setFxRouting(fxRouting);
      audioBridge.syncArpState(arpState, bpm);

      setCurrentSoundfont(sfInfo);
      setActivePresetIndex(0);
      setIsAudioStarted(true);
    } catch (err) {
      console.error('Error cargando SoundFont:', err);
      alert('Error cargando el archivo SoundFont en WebAssembly');
    } finally {
      setIsLoadingSf2(false);
    }
  };

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

      // Usar endpoint proxy /api/download para evitar bloqueo CORS de GitHub Releases
      const proxyUrl = `/api/download?url=${encodeURIComponent(instrument.downloadUrl)}`;
      let response: Response;
      try {
        response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Proxy status: ${response.status}`);
        }
      } catch {
        // Fallback directo si no está disponible el proxy
        response = await fetch(instrument.downloadUrl);
      }

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : instrument.fileSizeMb * 1024 * 1024;

      const reader = response.body?.getReader();
      if (!reader) {
        const buffer = await response.arrayBuffer();
        await finishLoadingSoundFont(
          instrument.id,
          instrument.filename,
          instrument.displayName,
          instrument.description,
          'Factory',
          instrument.fileSizeMb,
          buffer
        );
        setDownloadProgress((prev) => ({ ...prev, [instrument.id]: 100 }));
        return;
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
          setDownloadProgress((prev) => ({ ...prev, [instrument.id]: pct }));
        }
      }

      const fullBuffer = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      setDownloadProgress((prev) => ({ ...prev, [instrument.id]: 100 }));

      await finishLoadingSoundFont(
        instrument.id,
        instrument.filename,
        instrument.displayName,
        instrument.description,
        'Factory',
        instrument.fileSizeMb,
        fullBuffer.buffer
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

      await audioBridge.initialize();
      await audioBridge.loadSoundFont(entry.data, entry.filename);

      SoundFontStorage.setLastLoadedId(id);

      const sfInfo: SoundFontInfo = {
        id: entry.id,
        filename: entry.filename,
        displayName: entry.displayName,
        description: entry.description,
        category: entry.category,
        fileSizeMb: entry.fileSizeMb,
        presets: [{ index: 0, name: 'Default Patch', bank: 0, patch: 0 }],
      };

      knobs.forEach((val, idx) => audioBridge.setKnob(idx, val));
      audioBridge.setMasterFader(faders[8]);
      audioBridge.setFxRouting(fxRouting);
      audioBridge.syncArpState(arpState, bpm);

      setCurrentSoundfont(sfInfo);
      setActivePresetIndex(0);
      setIsAudioStarted(true);
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
      if (SoundFontStorage.getLastLoadedId() === id) {
        SoundFontStorage.setLastLoadedId('');
      }
    } catch (err) {
      console.error('Error eliminando SoundFont:', err);
    }
  };

  const handleTriggerNote = (note: number, velocity: number) => {
    if (!currentSoundfont) {
      setIsInstrumentModalOpen(true);
      return;
    }
    audioBridge.noteOn(note, velocity);
    setVisualKeyActive(note, true);
  };

  const handleReleaseNote = (note: number) => {
    audioBridge.noteOff(note);
    setVisualKeyActive(note, false);
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

  const { octaveOffset, setOctaveOffset } = useQwertyKeyboard({
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

  // Sincronización continua de Playhead de Secuenciador TR (60 FPS sin jitter)
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    const poll = () => {
      const step = audioBridge.seqGetCurrentStep();
      setSequencerState((prev) => (prev.currentStep !== step ? { ...prev, currentStep: step } : prev));
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

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
    const note = drumNotes[padIdx] || 36;
    handleTriggerNote(note, 120);
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

      {/* Header Unificado Noir-Tech */}
      <header className="relative z-20 border-b border-white/10 bg-[#08090d]/80 backdrop-blur-md px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 safe-horizontal">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-cyan-500/10 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              IMPACTSAMPPLER <span className="text-slate-500 font-medium">STUDIO</span>
            </h1>
          </div>
        </div>

        {/* Selector de SoundFont / Catálogo Fotográfico (Bloque 5) */}
        <button
          type="button"
          onClick={() => setIsInstrumentModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-cyan-500/40 cursor-pointer transition text-xs font-mono group"
          title="Abrir Catálogo Fotográfico de Instrumentos"
        >
          <Music className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
          {isLoadingSf2 ? (
            <span className="text-amber-300 font-medium text-[11px] flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
            </span>
          ) : (
            <span className="text-cyan-300 font-medium text-[11px] truncate max-w-[170px]">
              {currentSoundfont ? currentSoundfont.displayName : 'Explorar Instrumentos'}
            </span>
          )}
          <Upload className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 ml-0.5 transition" />
        </button>

        {/* Cápsula de Transporte Monolítica Noir-Tech */}
        <div className="flex items-center gap-1 bg-[#101216] border border-white/10 rounded-lg p-1 shadow-inner">
          {/* STOP Button */}
          <button
            type="button"
            onClick={handleStop}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all active:scale-95 ${
              !isPlaying
                ? 'bg-zinc-800 text-zinc-300 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
            }`}
            title="Detener Reproducción (MIDI CC 105 / Esc)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* PLAY / PAUSE Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all active:scale-95 ${
              isPlaying
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]'
                : 'text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.04]'
            }`}
            title="Reproducir / Pausar (MIDI CC 106 / Barra Espaciadora)"
          >
            <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-current' : ''}`} />
          </button>

          {/* RECORD Button */}
          <button
            type="button"
            onClick={handleToggleRecord}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all active:scale-95 ${
              isRecording
                ? 'bg-rose-950/70 text-rose-400 border border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.1)] animate-pulse'
                : 'text-zinc-400 hover:text-rose-400 hover:bg-white/[0.04]'
            }`}
            title="Grabar / Overdub (MIDI CC 107)"
          >
            <Circle className={`w-3.5 h-3.5 ${isRecording ? 'fill-current' : ''}`} />
          </button>

          {/* METRONOME CLICK Button */}
          <button
            type="button"
            onClick={handleToggleMetronome}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-all active:scale-95 ${
              isMetronomeActive
                ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'text-zinc-500 hover:text-cyan-400 hover:bg-white/[0.04]'
            }`}
            title="Metrónomo / Clic Acústico (MIDI CC 47)"
          >
            <Bell className="w-3.5 h-3.5" />
          </button>

          {/* Medidor de 4 Beats Orgánico */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 ml-0.5 border-l border-white/10" title={`Beat: ${isPlaying ? currentBeat + 1 : '-'}/4`}>
            {[0, 1, 2, 3].map((b) => {
              const isCurrent = isPlaying && currentBeat === b;
              const isAccent = b === 0;
              return (
                <div
                  key={b}
                  className={`w-1.5 h-3.5 rounded-[1px] transition-all duration-75 ${
                    isCurrent
                      ? isAccent
                        ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Telemetría y Controles de Audio */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {/* Toggle y Control de Octava de Teclado QWERTY */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setQwertyEnabled((prev) => !prev)}
              className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition ${
                qwertyEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Activar/Desactivar tocar con teclado QWERTY de la PC"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span className="font-bold">QWERTY</span>
              <div className={`w-1.5 h-1.5 rounded-full ${qwertyEnabled ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-slate-600'}`} />
            </button>

            {qwertyEnabled && (
              <div className="flex items-center gap-1 pl-1 border-l border-white/10">
                <button
                  type="button"
                  onClick={() => setOctaveOffset((prev) => Math.max(MIN_OCTAVE_OFFSET, prev - 1))}
                  disabled={octaveOffset <= MIN_OCTAVE_OFFSET}
                  className="w-4 h-4 flex items-center justify-center rounded bg-black/40 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none text-[10px] font-bold"
                  title="Octava Abajo (Atajo: Z)"
                >
                  -
                </button>
                <span className="text-amber-300 font-bold px-1 min-w-[28px] text-center" title="Octava actual (Atajos: Z para bajar, X para subir)">
                  {`C${3 + octaveOffset}`}
                </span>
                <button
                  type="button"
                  onClick={() => setOctaveOffset((prev) => Math.min(MAX_OCTAVE_OFFSET, prev + 1))}
                  disabled={octaveOffset >= MAX_OCTAVE_OFFSET}
                  className="w-4 h-4 flex items-center justify-center rounded bg-black/40 hover:bg-white/10 text-slate-300 disabled:opacity-30 disabled:pointer-events-none text-[10px] font-bold"
                  title="Octava Arriba (Atajo: X)"
                >
                  +
                </button>
              </div>
            )}
          </div>

          {/* Control de Tempo BPM */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleChangeBpm(-5)}
              className="w-4 h-4 flex items-center justify-center rounded bg-black/40 hover:bg-white/10 text-slate-300 text-[10px] font-bold transition"
              title="Disminuir tempo (-5 BPM)"
            >
              -
            </button>
            <span className="text-emerald-300 font-bold px-1 min-w-[50px] text-center" title="Tempo del Secuenciador y Arpegiador">
              {bpm} <span className="text-[9px] text-slate-500 font-normal">BPM</span>
            </span>
            <button
              type="button"
              onClick={() => handleChangeBpm(5)}
              className="w-4 h-4 flex items-center justify-center rounded bg-black/40 hover:bg-white/10 text-slate-300 text-[10px] font-bold transition"
              title="Aumentar tempo (+5 BPM)"
            >
              +
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[11px]"
            title={midiDevices.length > 0 ? `Dispositivo MIDI: ${midiDevices.join(', ')}` : 'Sin dispositivo MIDI conectado'}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${midiDevices.length > 0 ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-zinc-700'}`} />
            <span className="text-slate-400 text-[10.5px]">MIDI</span>
          </div>

          {!isAudioStarted && (
            <button
              onClick={handleStartAudio}
              className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] tracking-wider uppercase transition shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" /> Activar Audio
            </button>
          )}
        </div>
      </header>

      {/* Contenido Principal: Consola Flotante Centrada Ergonómicamente */}
      <main className="flex-1 p-2 sm:py-3 sm:px-4 flex flex-col justify-center items-center relative z-10 my-auto">
        <div className="studio-console flex flex-col w-full max-w-6xl my-auto transition-all duration-200">
          <HardwareSkeleton
            faders={faders}
            knobs={knobs}
            pitchBend={pitchBend}
            modWheel={modWheel}
            currentSoundfont={currentSoundfont}
            activePresetIndex={activePresetIndex}
            fxRouting={fxRouting}
            onChangeFxRouting={handleChangeFxRouting}
            arpState={arpState}
            onChangeArpState={handleChangeArpState}
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
              onChangeViewMode={setWorkstationMode}
              sequencerState={sequencerState}
              onTriggerPad={handleSequencerTriggerPad}
              onTogglePlay={handleTogglePlay}
              onStop={handleStop}
              onToggleRecord={handleToggleRecord}
              bpm={bpm}
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
            />
          </HardwareSkeleton>
        </div>
      </main>

      {/* Barra Inferior de Estado */}
      <footer className="relative z-20 border-t border-white/10 bg-[#08090d]/80 px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 safe-horizontal">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-white/10">
            <span className={isPlaying ? 'text-emerald-400 font-bold' : 'text-slate-500 font-normal'}>
              {isPlaying ? `▶ PLAY · Compás ${currentBeat + 1}/4` : '■ STOPPED'}
            </span>
            {isRecording && <span className="text-rose-400 font-bold ml-1 animate-pulse">● REC</span>}
          </div>
          {qwertyEnabled && (
            <span className="hidden md:inline text-slate-500">
              Teclado: <span className="text-amber-300/90 font-medium">A–;</span> Notas · <span className="text-amber-300/90 font-medium">Z/X</span> Octava ({`C${3 + octaveOffset}`})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-500">{bpm} BPM</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400 truncate max-w-[200px]">
            {currentSoundfont ? currentSoundfont.displayName : 'Sin instrumento'}
          </span>
        </div>
      </footer>

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

      {/* Guardia de Orientación Móvil (Rotate Device Overlay) */}
      <OrientationGuard />
    </div>
  );
};
