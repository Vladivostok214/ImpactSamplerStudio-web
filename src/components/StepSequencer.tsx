import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Check,
  RotateCcw,
  Eraser,
  Trash2,
  Eye,
} from "lucide-react";
import {
  PadSlotInfo,
  PadEngineMode,
  QuantizeMode,
  SequencerStateInfo,
  StepResolution,
} from "../types/sampler";
import {
  MidiLearnTarget,
  MidiLearnMapping,
  getMidiNoteName,
  getActionMappingLabel,
} from "../types/midiLearn";

interface StepSequencerProps {
  viewMode?: "keys" | "seq";
  onChangeViewMode?: (mode: "keys" | "seq") => void;
  sequencerState: SequencerStateInfo;
  padSlots?: PadSlotInfo[];
  padEngineMode?: PadEngineMode;
  onChangePadEngineMode?: (mode: PadEngineMode) => void;
  activePads?: Set<number>;
  onTriggerPad?: (padIdx: number) => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleRecord?: () => void;
  bpm: number;
  onSetBpm?: (bpm: number) => void;
  onAdjustBpm?: (delta: number) => void;
  onTapTempo?: () => void;
  onToggleStep: (padIdx: number, stepIdx: number) => void;
  onClearTrack?: (padIdx: number) => void;
  onClearAll?: () => void;
  onChangeResolution?: (res: StepResolution) => void;
  onToggleBank?: () => void;
  onUndo?: () => void;
  isClickEnabled?: boolean;
  onToggleClick?: () => void;
  isVisualMetronomeVisible?: boolean;
  onToggleVisualMetronome?: () => void;
  isMidiLearnActive?: boolean;
  selectedLearnTarget?: MidiLearnTarget | null;
  onSelectLearnTarget?: (target: MidiLearnTarget) => void;
  midiLearnMapping?: MidiLearnMapping;
  quantizeMode?: QuantizeMode;
  quantizeStrength?: number;
  onSetQuantizeMode?: (mode: QuantizeMode) => void;
  onSetQuantizeStrength?: (strength: number) => void;
  onRequantize?: () => void;
}

const DEFAULT_DRUM_NAMES = [
  "Kick 1",
  "Snare",
  "Closed HH",
  "Open HH",
  "Low Tom",
  "Mid Tom",
  "Crash",
  "Ride",
];

const DEFAULT_PAD_NOTES = [36, 38, 42, 46, 41, 45, 49, 51];

const PAD_ROLE_THEMES = [
  // Pad 1: KICK
  {
    border: "border-amber-500/40 hover:border-amber-400",
    bg: "bg-gradient-to-b from-[#1a140d] via-[#120e09] to-[#0a0805]",
    text: "text-amber-200",
    shadow: "shadow-[inset_0_1px_0_rgba(245,158,11,0.2)]",
    hit: "bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border-2 border-white shadow-[0_0_24px_rgba(245,158,11,1)] font-black scale-[0.98]",
  },
  // Pad 2: SNARE
  {
    border: "border-emerald-500/40 hover:border-emerald-400",
    bg: "bg-gradient-to-b from-[#0d1a14] via-[#09120e] to-[#050a08]",
    text: "text-emerald-200",
    shadow: "shadow-[inset_0_1px_0_rgba(16,185,129,0.2)]",
    hit: "bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-600 text-black border-2 border-white shadow-[0_0_24px_rgba(16,185,129,1)] font-black scale-[0.98]",
  },
  // Pad 3: CLOSED HAT
  {
    border: "border-teal-500/40 hover:border-teal-400",
    bg: "bg-gradient-to-b from-[#0d1a19] via-[#091211] to-[#050a0a]",
    text: "text-teal-200",
    shadow: "shadow-[inset_0_1px_0_rgba(20,184,166,0.2)]",
    hit: "bg-gradient-to-b from-teal-400 via-teal-500 to-teal-600 text-black border-2 border-white shadow-[0_0_24px_rgba(20,184,166,1)] font-black scale-[0.98]",
  },
  // Pad 4: OPEN HAT
  {
    border: "border-cyan-500/40 hover:border-cyan-400",
    bg: "bg-gradient-to-b from-[#0d181a] via-[#091112] to-[#05090a]",
    text: "text-cyan-200",
    shadow: "shadow-[inset_0_1px_0_rgba(6,182,212,0.2)]",
    hit: "bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 text-black border-2 border-white shadow-[0_0_24px_rgba(6,182,212,1)] font-black scale-[0.98]",
  },
  // Pad 5: TOM LOW
  {
    border: "border-sky-500/40 hover:border-sky-400",
    bg: "bg-gradient-to-b from-[#0d151a] via-[#090f12] to-[#05080a]",
    text: "text-sky-200",
    shadow: "shadow-[inset_0_1px_0_rgba(14,165,233,0.2)]",
    hit: "bg-gradient-to-b from-sky-400 via-sky-500 to-sky-600 text-black border-2 border-white shadow-[0_0_24px_rgba(14,165,233,1)] font-black scale-[0.98]",
  },
  // Pad 6: TOM MID
  {
    border: "border-orange-500/40 hover:border-orange-400",
    bg: "bg-gradient-to-b from-[#1a120d] via-[#120d09] to-[#0a0705]",
    text: "text-orange-200",
    shadow: "shadow-[inset_0_1px_0_rgba(249,115,22,0.2)]",
    hit: "bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 text-black border-2 border-white shadow-[0_0_24px_rgba(249,115,22,1)] font-black scale-[0.98]",
  },
  // Pad 7: CRASH
  {
    border: "border-rose-500/40 hover:border-rose-400",
    bg: "bg-gradient-to-b from-[#1a0d10] via-[#12090b] to-[#0a0506]",
    text: "text-rose-200",
    shadow: "shadow-[inset_0_1px_0_rgba(244,63,94,0.2)]",
    hit: "bg-gradient-to-b from-rose-400 via-rose-500 to-rose-600 text-black border-2 border-white shadow-[0_0_24px_rgba(244,63,94,1)] font-black scale-[0.98]",
  },
  // Pad 8: RIDE
  {
    border: "border-purple-500/40 hover:border-purple-400",
    bg: "bg-gradient-to-b from-[#170d1a] via-[#100912] to-[#09050a]",
    text: "text-purple-200",
    shadow: "shadow-[inset_0_1px_0_rgba(168,85,247,0.2)]",
    hit: "bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 text-black border-2 border-white shadow-[0_0_24px_rgba(168,85,247,1)] font-black scale-[0.98]",
  },
];

const STEPS_16 = Array.from({ length: 16 }, (_, i) => i);

export const StepSequencer: React.FC<StepSequencerProps> = React.memo(({
  viewMode = "keys",
  onChangeViewMode,
  sequencerState,
  padSlots = [],
  padEngineMode: propPadEngineMode,
  onChangePadEngineMode,
  activePads = new Set(),
  onTriggerPad,
  onTogglePlay,
  onStop,
  onToggleRecord,
  bpm,
  onSetBpm,
  onAdjustBpm,
  onTapTempo,
  onToggleStep,
  onClearTrack,
  onClearAll,
  onChangeResolution,
  onToggleBank,
  onUndo,
  isClickEnabled = false,
  onToggleClick,
  isVisualMetronomeVisible: propVisualMetronomeVisible,
  onToggleVisualMetronome,
  isMidiLearnActive = false,
  selectedLearnTarget = null,
  onSelectLearnTarget,
  midiLearnMapping,
  quantizeMode: propQuantizeMode,
  quantizeStrength: propQuantizeStrength,
  onSetQuantizeMode,
  onSetQuantizeStrength,
  onRequantize,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<number>(0);
  const [activePage, setActivePage] = useState<number>(0); // 0 = 1-16, 1 = 17-32

  // Menús desplegables de la cinta superior
  const [isKitMenuOpen, setIsKitMenuOpen] = useState<boolean>(false);
  const [isGridMenuOpen, setIsGridMenuOpen] = useState<boolean>(false);
  const [isQMenuOpen, setIsQMenuOpen] = useState<boolean>(false);

  // Estados locales de quantize, kit y metrónomo visual si no se pasan por props
  const [internalPadEngineMode, setInternalPadEngineMode] = useState<PadEngineMode>("drumKitSf2");
  const padEngineMode = propPadEngineMode || internalPadEngineMode;

  const [internalQuantizeMode, setInternalQuantizeMode] = useState<QuantizeMode>(
    sequencerState.quantizeMode || "sixteenth"
  );
  const quantizeMode = propQuantizeMode || internalQuantizeMode;

  const [internalQuantizeStrength, setInternalQuantizeStrength] = useState<number>(
    sequencerState.quantizeStrength ?? 1
  );
  const quantizeStrength = propQuantizeStrength ?? internalQuantizeStrength;

  const [internalVisualMetronome, setInternalVisualMetronome] = useState<boolean>(false);
  const isVisualMetronomeVisible = propVisualMetronomeVisible ?? internalVisualMetronome;

  // Estado para edición directa de BPM con teclado
  const [isEditingBpm, setIsEditingBpm] = useState<boolean>(false);
  const [bpmInput, setBpmInput] = useState<string>(Math.round(bpm).toString());

  const kitMenuRef = useRef<HTMLDivElement>(null);
  const gridMenuRef = useRef<HTMLDivElement>(null);
  const qMenuRef = useRef<HTMLDivElement>(null);

  const { isPlaying, isPaused, isRecording, currentStep, resolution, currentBank, pattern } = sequencerState;

  // Cierre al hacer clic fuera de los menús flotantes
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (kitMenuRef.current && !kitMenuRef.current.contains(target)) {
        setIsKitMenuOpen(false);
      }
      if (gridMenuRef.current && !gridMenuRef.current.contains(target)) {
        setIsGridMenuOpen(false);
      }
      if (qMenuRef.current && !qMenuRef.current.contains(target)) {
        setIsQMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isEditingBpm) {
      setBpmInput(Math.round(bpm).toString());
    }
  }, [bpm, isEditingBpm]);

  const handleBpmSubmit = () => {
    setIsEditingBpm(false);
    const parsed = parseFloat(bpmInput);
    if (!isNaN(parsed) && parsed >= 40 && parsed <= 300) {
      const rounded = Math.round(parsed);
      if (onSetBpm) {
        onSetBpm(rounded);
      } else if (onAdjustBpm) {
        onAdjustBpm(rounded - bpm);
      }
    } else {
      setBpmInput(Math.round(bpm).toString());
    }
  };

  const handleSelectQuantizeMode = (mode: QuantizeMode) => {
    setInternalQuantizeMode(mode);
    onSetQuantizeMode?.(mode);
  };

  const handleSelectQuantizeStrength = (strength: number) => {
    setInternalQuantizeStrength(strength);
    onSetQuantizeStrength?.(strength);
  };

  const handleSelectKit = (mode: PadEngineMode) => {
    setInternalPadEngineMode(mode);
    onChangePadEngineMode?.(mode);
    setIsKitMenuOpen(false);
  };

  const handleToggleVisualMetronomeClick = () => {
    if (onToggleVisualMetronome) {
      onToggleVisualMetronome();
    } else {
      setInternalVisualMetronome((prev) => !prev);
    }
  };

  const isSeqOpen = viewMode === "seq";

  return (
    <div className="w-full flex flex-col bg-[#050507] border-t border-white/[0.08] select-none relative z-40">
      {/* 1. Bahía de Secuenciación Rítmica TR-Style (Visible únicamente en modo SEQ) */}
      {isSeqOpen && (
        <div className="p-1.5 sm:p-2 lg:p-3.5 flex flex-col gap-1 lg:gap-1.5 animate-in fade-in duration-150">
          {/* Cinta Superior de Control del Secuenciador (Kit, Banco, Grilla, Páginas, Cuantización y Edición) */}
          <div className="flex items-center justify-between pb-1 lg:pb-2 mb-0.5 lg:mb-1 border-b border-white/[0.08] flex-wrap sm:flex-nowrap gap-1.5 lg:gap-2 text-[9px] lg:text-[10px] font-mono select-none">
            {/* Izquierda: Kit + Banco A/B */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
              {/* Selector de Kit con Menú Desplegable Flotante */}
              <div ref={kitMenuRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setIsKitMenuOpen((prev) => !prev)}
                  className="h-6 lg:h-7 px-1.5 lg:px-2 bg-[#0e0f14] hover:bg-[#161820] border border-white/15 hover:border-emerald-500/60 rounded-md flex items-center gap-1 lg:gap-1.5 text-[8.5px] lg:text-[9.5px] font-mono transition shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.6)] group select-none cursor-pointer"
                  title="Kit de Batería"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  <span className="text-[8.5px] lg:text-[9.5px] uppercase font-bold tracking-wider text-zinc-400">KIT:</span>
                  <span className="font-bold text-zinc-100 group-hover:text-emerald-400 transition max-w-[90px] truncate">
                    {padEngineMode === "drumKitSf2" ? "Yamaha RX7" : "Custom WAV"}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-zinc-400 group-hover:text-white transition-transform duration-150 shrink-0 ${
                      isKitMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isKitMenuOpen && (
                  <div className="absolute top-full mt-1.5 left-0 z-50 w-52 bg-[#0d0e12] border border-white/20 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.08)] py-1 text-xs font-mono text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1 text-[9.5px] uppercase font-bold tracking-wider text-zinc-400 border-b border-white/10 mb-1">
                      Kits de Batería
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectKit("drumKitSf2")}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-[10px] ${
                        padEngineMode === "drumKitSf2"
                          ? "bg-emerald-500/20 text-emerald-400 font-bold"
                          : "hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>Yamaha RX7 (SF2)</span>
                      {padEngineMode === "drumKitSf2" && <Check size={12} className="text-emerald-400" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectKit("wavSampler")}
                      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-[10px] ${
                        padEngineMode === "wavSampler"
                          ? "bg-emerald-500/20 text-emerald-400 font-bold"
                          : "hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>Custom WAV (Pads)</span>
                      {padEngineMode === "wavSampler" && <Check size={12} className="text-emerald-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Selector de Banco Compacto: A / B */}
              {(() => {
                const isBankSelected =
                  isMidiLearnActive &&
                  selectedLearnTarget?.type === "action" &&
                  selectedLearnTarget.id === "bank";
                const bankMapped = getActionMappingLabel(midiLearnMapping, "bank");
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isMidiLearnActive) {
                        onSelectLearnTarget?.({ type: "action", id: "bank" });
                        return;
                      }
                      onToggleBank?.();
                    }}
                    title={
                      isMidiLearnActive
                        ? `Banco A/B: ${bankMapped ? `Asignado (${bankMapped})` : "Sin asignar"}`
                        : `Cambiar Banco (Actual: ${currentBank.toUpperCase()})`
                    }
                    className={`h-6 lg:h-7 px-2 lg:px-2.5 rounded-md text-[8.5px] lg:text-[9.5px] font-mono font-bold tracking-wider border transition-all active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.5)] cursor-pointer flex items-center gap-1 lg:gap-1.5 ${
                      isBankSelected
                        ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse text-amber-200"
                        : isMidiLearnActive
                        ? "border border-amber-500/60 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                        : currentBank === "b"
                        ? "bg-purple-900/40 text-purple-200 border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                        : "bg-cyan-950/40 text-cyan-200 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                    }`}
                  >
                    <span className="text-zinc-400 font-semibold text-[8.5px] lg:text-[9px] tracking-wider">BANK</span>
                    <span>{currentBank.toUpperCase()}</span>
                  </button>
                );
              })()}
            </div>

            {/* Derecha: Resolución Grid + Páginas 1/32 + Q + Separador + Cápsula de Edición */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
              {/* Selector de Resolución con Menú Desplegable Flotante */}
              {(() => {
                const isGridSelected =
                  isMidiLearnActive &&
                  selectedLearnTarget?.type === "action" &&
                  selectedLearnTarget.id === "grid";
                const gridMapped = getActionMappingLabel(midiLearnMapping, "grid");
                return (
                  <div ref={gridMenuRef} className="relative z-50">
                    <button
                      type="button"
                      onClick={() => {
                        if (isMidiLearnActive) {
                          onSelectLearnTarget?.({ type: "action", id: "grid" });
                          return;
                        }
                        setIsGridMenuOpen((prev) => !prev);
                      }}
                      title={
                        isMidiLearnActive
                          ? `Resolución Grilla: ${gridMapped ? `Asignado (${gridMapped})` : "Sin asignar"}`
                          : "Seleccionar Resolución de Grilla"
                      }
                      className={`h-6 lg:h-7 px-2 lg:px-2.5 rounded-md text-[8.5px] lg:text-[9.5px] font-mono font-bold flex items-center gap-1 lg:gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] cursor-pointer transition select-none ${
                        isGridSelected
                          ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse text-amber-200"
                          : isMidiLearnActive
                          ? "border border-amber-500/60 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                          : "bg-[#040406] hover:bg-[#121318] border border-white/15 hover:border-emerald-500/60 text-emerald-400"
                      }`}
                    >
                      <span className="text-zinc-400 text-[8.5px] lg:text-[9px] font-semibold tracking-wider">GRID:</span>
                      <span>{resolution === "eighth" ? "1/8" : resolution === "sixteenth" ? "1/16" : "1/32"}</span>
                      <ChevronDown
                        size={11}
                        className={`text-zinc-400 transition-transform duration-150 ${
                          isGridMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isGridMenuOpen && (
                      <div className="absolute top-full mt-1.5 right-0 z-50 w-48 bg-[#0d0e12] border border-white/20 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.08)] py-1 text-xs font-mono text-zinc-200 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-1 text-[9px] uppercase font-bold tracking-wider text-zinc-400 border-b border-white/10 mb-1">
                          Resolución de Grilla
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeResolution?.("eighth");
                            setIsGridMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-[10px] ${
                            resolution === "eighth"
                              ? "bg-emerald-500/20 text-emerald-400 font-bold"
                              : "hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>1/8 (Corcheas - 8 pasos)</span>
                          {resolution === "eighth" && <Check size={12} className="text-emerald-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeResolution?.("sixteenth");
                            setIsGridMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-[10px] ${
                            resolution === "sixteenth"
                              ? "bg-emerald-500/20 text-emerald-400 font-bold"
                              : "hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>1/16 (Semicorcheas - 16 pasos)</span>
                          {resolution === "sixteenth" && <Check size={12} className="text-emerald-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeResolution?.("thirtySecond");
                            setIsGridMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer text-[10px] ${
                            resolution === "thirtySecond"
                              ? "bg-emerald-500/20 text-emerald-400 font-bold"
                              : "hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span>1/32 (Fusas - 32 pasos / 2 págs)</span>
                          {resolution === "thirtySecond" && <Check size={12} className="text-emerald-400" />}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Selector de Página Minimalista para Grilla 1/32 (1 / 2) */}
              {(() => {
                const isPageSelected =
                  isMidiLearnActive &&
                  selectedLearnTarget?.type === "action" &&
                  selectedLearnTarget.id === "page";
                const pageMapped = getActionMappingLabel(midiLearnMapping, "page");
                return (
                  resolution === "thirtySecond" && (
                    <div
                      onClick={() => {
                        if (isMidiLearnActive) {
                          onSelectLearnTarget?.({ type: "action", id: "page" });
                        }
                      }}
                      title={
                        isMidiLearnActive
                          ? `Página 1/2: ${pageMapped ? `Asignado (${pageMapped})` : "Sin asignar"}`
                          : undefined
                      }
                      className={`flex items-center bg-[#040406] border rounded-md p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] gap-0.5 cursor-pointer ${
                        isPageSelected
                          ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse"
                          : isMidiLearnActive
                          ? "border-amber-500/60 hover:border-amber-400"
                          : "border-white/15"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => !isMidiLearnActive && setActivePage(0)}
                        title={isMidiLearnActive ? undefined : "Página 1 (Pasos 1-16)"}
                        className={`w-5 h-5 lg:w-6 lg:h-6 rounded font-mono text-[8.5px] lg:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                          activePage === 0
                            ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span>1</span>
                        {isPlaying && currentStep < 16 && (
                          <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => !isMidiLearnActive && setActivePage(1)}
                        title={isMidiLearnActive ? undefined : "Página 2 (Pasos 17-32)"}
                        className={`w-5 h-5 lg:w-6 lg:h-6 rounded font-mono text-[8.5px] lg:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                          activePage === 1
                            ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span>2</span>
                        {isPlaying && currentStep >= 16 && (
                          <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
                        )}
                      </button>
                    </div>
                  )
                );
              })()}

              {/* Botón Q y Popover Minimalista de Cuantización */}
              <div ref={qMenuRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setIsQMenuOpen((prev) => !prev)}
                  title={`Cuantización de Entrada: ${quantizeMode.toUpperCase()} (${Math.round(quantizeStrength * 100)}%)`}
                  className={`h-6 w-6 lg:h-7 lg:w-7 rounded-md text-[9px] lg:text-[10px] font-mono font-bold border transition-all flex items-center justify-center relative active:scale-95 cursor-pointer select-none ${
                    quantizeMode !== "off"
                      ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                      : "bg-white/[0.03] text-zinc-500 border-white/10 hover:text-white"
                  }`}
                >
                  <span>Q</span>
                  {quantizeMode !== "off" && (
                    <span className="absolute top-0.5 right-0.5 lg:top-1 lg:right-1 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_4px_#22d3ee]" />
                  )}
                </button>

                {isQMenuOpen && (
                  <div className="absolute top-full mt-1.5 right-0 z-50 w-52 bg-[#0c0d12] border border-white/20 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_1px_1px_rgba(255,255,255,0.08)] p-2.5 text-xs font-mono text-zinc-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2.5">
                    {/* Selector Horizontal de Modos */}
                    <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-lg p-0.5">
                      {(["off", "eighth", "sixteenth", "thirtySecond"] as const).map((m) => (
                        <button
                          key={`q-mode-${m}`}
                          type="button"
                          onClick={() => handleSelectQuantizeMode(m)}
                          className={`flex-1 py-1 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                            quantizeMode === m
                              ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_6px_rgba(6,182,212,0.3)]"
                              : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {m === "off" ? "OFF" : m === "eighth" ? "1/8" : m === "sixteenth" ? "1/16" : "1/32"}
                        </button>
                      ))}
                    </div>

                    {/* Slider Minimalista de Fuerza */}
                    {quantizeMode !== "off" && (
                      <div className="flex flex-col gap-1 px-0.5">
                        <div className="flex items-center justify-between text-[9px] text-zinc-400 font-semibold">
                          <span>STRENGTH</span>
                          <span className="text-cyan-300 font-bold tabular-nums">
                            {Math.round(quantizeStrength * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={quantizeStrength}
                          onChange={(e) => handleSelectQuantizeStrength(parseFloat(e.target.value))}
                          className="w-full accent-cyan-400 h-1 bg-white/10 rounded appearance-none cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Botón Re-cuantizar limpio */}
                    <button
                      type="button"
                      onClick={() => {
                        onRequantize?.();
                        setIsQMenuOpen(false);
                      }}
                      className="w-full py-1 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 hover:border-cyan-400 rounded-md text-[9.5px] font-bold text-cyan-200 transition-all active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)] text-center"
                    >
                      RE-QUANTIZE
                    </button>
                  </div>
                )}
              </div>

              {/* Separador vertical fino */}
              <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

              {/* Cápsula Unificada de Edición del Secuenciador [ UNDO | CLR TRK | 🗑 ] */}
              <div className="flex items-stretch h-6 lg:h-7 rounded-md bg-[#18191e] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Deshacer (Undo) */}
                {(() => {
                  const isSelected =
                    isMidiLearnActive &&
                    selectedLearnTarget?.type === "action" &&
                    selectedLearnTarget.id === "undo";
                  const mapped = getActionMappingLabel(midiLearnMapping, "undo");
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMidiLearnActive) {
                          onSelectLearnTarget?.({ type: "action", id: "undo" });
                          return;
                        }
                        onUndo?.();
                      }}
                      title={
                        isMidiLearnActive
                          ? `Deshacer (Undo): ${mapped ? `Asignado (${mapped})` : "Sin asignar"}`
                          : "Deshacer (Undo)"
                      }
                      className={`px-1.5 lg:px-2 h-full flex items-center justify-center gap-1 lg:gap-1.5 font-mono text-[8.5px] lg:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border-r border-white/10 ${
                        isSelected
                          ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                          : isMidiLearnActive
                          ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40"
                          : "text-zinc-300 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12]"
                      }`}
                    >
                      <RotateCcw size={10} className="text-cyan-400 shrink-0" />
                      <span>UNDO</span>
                    </button>
                  );
                })()}

                {/* Limpiar Pista Seleccionada (Clear Track) */}
                {(() => {
                  const isSelected =
                    isMidiLearnActive &&
                    selectedLearnTarget?.type === "action" &&
                    selectedLearnTarget.id === "clearTrack";
                  const mapped = getActionMappingLabel(midiLearnMapping, "clearTrack");
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMidiLearnActive) {
                          onSelectLearnTarget?.({ type: "action", id: "clearTrack" });
                          return;
                        }
                        onClearTrack?.(selectedTrack);
                      }}
                      title={
                        isMidiLearnActive
                          ? `Borrar Pista: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}`
                          : `Borrar Notas de la Pista Seleccionada (Pad ${selectedTrack + 1})`
                      }
                      className={`px-1.5 lg:px-2 h-full flex items-center justify-center gap-1 lg:gap-1.5 font-mono text-[8.5px] lg:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border-r border-white/10 ${
                        isSelected
                          ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                          : isMidiLearnActive
                          ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40"
                          : "text-zinc-400 hover:text-amber-400 hover:bg-white/[0.06] active:bg-white/[0.12]"
                      }`}
                    >
                      <Eraser
                        size={10}
                        className={
                          isSelected
                            ? "text-amber-200 shrink-0"
                            : isMidiLearnActive
                            ? "text-amber-300 shrink-0"
                            : "text-amber-400/90 shrink-0"
                        }
                      />
                      <span>CLR TRK</span>
                    </button>
                  );
                })()}

                {/* Limpiar Patrón Activo */}
                {(() => {
                  const isSelected =
                    isMidiLearnActive &&
                    selectedLearnTarget?.type === "action" &&
                    selectedLearnTarget.id === "clearPattern";
                  const mapped = getActionMappingLabel(midiLearnMapping, "clearPattern");
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMidiLearnActive) {
                          onSelectLearnTarget?.({ type: "action", id: "clearPattern" });
                          return;
                        }
                        onClearAll?.();
                      }}
                      title={
                        isMidiLearnActive
                          ? `Borrar Todo el Patrón: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}`
                          : "Borrar Todo el Patrón"
                      }
                      className={`w-6 lg:w-7 h-full flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                          : isMidiLearnActive
                          ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40"
                          : "text-zinc-400 hover:text-red-400 hover:bg-white/[0.06] active:bg-white/[0.12]"
                      }`}
                    >
                      <Trash2 size={10} className="shrink-0" />
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 8 Pistas de Percusión con Botones Mecánicos TR-Style */}
          <div className="flex flex-col gap-[3px] sm:gap-1 lg:gap-1.5 overflow-x-auto">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((padIdx) => {
              const padName = padSlots[padIdx]?.sampleName || DEFAULT_DRUM_NAMES[padIdx] || `P${padIdx + 1}`;
              const theme = PAD_ROLE_THEMES[padIdx] || PAD_ROLE_THEMES[0];
              const isHit = activePads.has(padIdx + 1);
              const isSelected = selectedTrack === padIdx;
              const mappedNote = midiLearnMapping?.pads[padIdx] ?? DEFAULT_PAD_NOTES[padIdx];
              const isLearnSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "pad" &&
                selectedLearnTarget.index === padIdx;

              return (
                <div key={`track-${padIdx}`} className="flex items-center gap-1.5 lg:gap-2">
                  {/* Botón de Pista / Disparador de Pad */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isMidiLearnActive) {
                        onSelectLearnTarget?.({ type: "pad", index: padIdx });
                        return;
                      }
                      setSelectedTrack(padIdx);
                      onTriggerPad?.(padIdx);
                    }}
                    className={`w-20 sm:w-24 lg:w-32 h-[22px] sm:h-6 lg:h-8 rounded-md lg:rounded-lg flex items-center justify-between px-1.5 lg:px-2.5 transition-all shrink-0 cursor-pointer border font-mono text-[8.5px] lg:text-[10px] font-bold select-none touch-manipulation ${
                      isLearnSelected
                        ? "border-2 border-amber-400 bg-amber-950/40 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.85)] ring-2 ring-amber-400/60 animate-pulse"
                        : isMidiLearnActive
                        ? "border border-amber-500/50 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                        : isHit
                        ? theme.hit
                        : isSelected
                        ? `${theme.border} bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.2)]`
                        : `${theme.border} ${theme.bg} ${theme.text} ${theme.shadow} hover:brightness-125`
                    }`}
                    title={
                      isMidiLearnActive
                        ? `Pad ${padIdx + 1} (${padName}): Asignar MIDI (${getMidiNoteName(mappedNote)} #${mappedNote})`
                        : `Disparar Pad ${padIdx + 1}: ${padName} (${getMidiNoteName(mappedNote)})`
                    }
                  >
                    <span className="truncate">{padName}</span>
                    <span className={`text-[7.5px] lg:text-[8px] ${isMidiLearnActive ? "text-amber-400 font-bold" : "text-zinc-500"}`}>
                      {isMidiLearnActive ? getMidiNoteName(mappedNote) : `P${padIdx + 1}`}
                    </span>
                  </button>

                  {/* 16 Botones de Paso TR */}
                  <div className="flex-1 flex items-center gap-0.5 sm:gap-1 min-w-0">
                    {STEPS_16.map((stepIdx) => {
                      const actualStep = resolution === "thirtySecond" ? activePage * 16 + stepIdx : stepIdx;
                      const isStepDisabled = resolution === "eighth" && stepIdx >= 8;
                      const velocity = isStepDisabled ? 0 : pattern[padIdx]?.[actualStep] || 0;
                      const isActive = velocity > 0;
                      const isPlayhead = (isPlaying || isPaused) && currentStep === actualStep && !isStepDisabled;
                      const isBeatStart = stepIdx % 4 === 0;
                      const isEvenGroup = Math.floor(stepIdx / 4) % 2 === 0;

                      return (
                        <React.Fragment key={`pad-${padIdx}-step-${stepIdx}`}>
                          {stepIdx > 0 && stepIdx % 4 === 0 && <div className="w-0.5 sm:w-1 lg:w-1.5" />}
                          <button
                            type="button"
                            disabled={isStepDisabled}
                            onClick={() => {
                              if (!isStepDisabled) {
                                onToggleStep(padIdx, actualStep);
                              }
                            }}
                            className={`flex-1 h-[22px] sm:h-6 lg:h-8 rounded-[3px] font-mono text-[9px] transition-all relative overflow-hidden active:scale-95 touch-manipulation ${
                              isStepDisabled
                                ? "opacity-15 bg-[#090a0d] border border-white/[0.04] cursor-not-allowed pointer-events-none"
                                : isActive
                                ? isPlayhead
                                  ? "bg-amber-300 text-black border border-white shadow-[0_0_14px_#ffffff] z-10 cursor-pointer"
                                  : "bg-gradient-to-b from-[#3a2f1c] via-[#2a2113] to-[#18130a] border-t border-amber-500/80 border-b-[2px] border-b-black shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_0_10px_rgba(245,158,11,0.35)] cursor-pointer"
                                : isPlayhead
                                ? "bg-[#282d38] border border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer"
                                : isEvenGroup
                                ? "bg-gradient-to-b from-[#252730] via-[#1b1c22] to-[#111216] border-t border-white/10 border-b-[2px] border-b-black shadow-inner hover:brightness-125 cursor-pointer"
                                : "bg-gradient-to-b from-[#1c1e24] via-[#14151a] to-[#0c0d10] border-t border-white/5 border-b-[2px] border-b-black shadow-inner hover:brightness-125 cursor-pointer"
                            }`}
                          >
                            {!isStepDisabled && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span
                                  className={`w-2 sm:w-2.5 lg:w-3.5 h-1 rounded-sm transition-all ${
                                    isActive
                                      ? isPlayhead
                                        ? "bg-white shadow-[0_0_10px_white]"
                                        : "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                                      : isPlayhead
                                      ? "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                                      : isBeatStart
                                      ? "bg-white/30"
                                      : "bg-white/10"
                                  }`}
                                />
                              </div>
                            )}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Barra de Docking Inferior Maestro (Siempre visible, conmutador de modos, kit, y controles de transporte) */}
      <div className="px-2 py-1.5 sm:px-3 lg:px-4 lg:py-2 bg-gradient-to-b from-[#101115] via-[#0b0c0f] to-[#060709] border-t border-white/[0.08] flex items-center justify-between gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap relative z-50 overflow-visible">
        {/* Lado Izquierdo: [ KEYS ] / [ SEQ ] Conmutador Físico */}
        <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          {(() => {
            const isWsSelected =
              isMidiLearnActive &&
              selectedLearnTarget?.type === "action" &&
              selectedLearnTarget.id === "workstationMode";
            const wsMapped = getActionMappingLabel(midiLearnMapping, "workstationMode");
            return (
              <div
                onClick={() => {
                  if (isMidiLearnActive) {
                    onSelectLearnTarget?.({ type: "action", id: "workstationMode" });
                  }
                }}
                className={`flex items-center bg-[#040406] border rounded-md p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] ${
                  isWsSelected
                    ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse"
                    : isMidiLearnActive
                    ? "border-amber-500/60 hover:border-amber-400"
                    : "border-white/15"
                }`}
                title={
                  isMidiLearnActive
                    ? `Vista Workstation: ${wsMapped ? `Asignado (${wsMapped})` : "Sin asignar"}`
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => !isMidiLearnActive && onChangeViewMode?.("keys")}
                  title={isMidiLearnActive ? undefined : "Modo Teclado"}
                  className={`px-2 py-0.5 lg:px-2.5 lg:py-1 rounded font-mono text-[8.5px] lg:text-[9.5px] font-bold tracking-wider transition-all cursor-pointer ${
                    !isSeqOpen
                      ? "bg-gradient-to-b from-cyan-400 to-cyan-600 text-black shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  KEYS
                </button>
                <button
                  type="button"
                  onClick={() => !isMidiLearnActive && onChangeViewMode?.("seq")}
                  title={isMidiLearnActive ? undefined : "Modo Secuenciador"}
                  className={`px-2 py-0.5 lg:px-2.5 lg:py-1 rounded font-mono text-[8.5px] lg:text-[9.5px] font-bold tracking-wider transition-all cursor-pointer ${
                    isSeqOpen
                      ? "bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  SEQ
                </button>
              </div>
            );
          })()}
        </div>

        {/* Lado Derecho: Display VFD de BPM y Transporte Maestro */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Display VFD de Tempo (Pantalla Digital Hardware) */}
          <div className="flex items-center bg-[#030305] border border-white/15 rounded-lg p-0.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.05)]">
            {/* BPM Down (-) */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "bpmDown";
              const mapped = getActionMappingLabel(midiLearnMapping, "bpmDown");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "bpmDown" });
                      return;
                    }
                    onAdjustBpm?.(-1);
                  }}
                  title={isMidiLearnActive ? `Tempo -1: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}` : "Tempo -1"}
                  className={`w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded font-mono font-bold text-[11px] lg:text-xs transition cursor-pointer ${
                    isSelected
                      ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse text-amber-200"
                      : isMidiLearnActive
                      ? "border border-amber-500/60 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  -
                </button>
              );
            })()}

            <div className="flex items-baseline px-1.5 lg:px-2.5 border-x border-white/10 mx-0.5">
              {isEditingBpm ? (
                <input
                  type="number"
                  min="40"
                  max="300"
                  step="1"
                  autoFocus
                  value={bpmInput}
                  onChange={(e) => setBpmInput(e.target.value)}
                  onBlur={handleBpmSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBpmSubmit();
                    if (e.key === "Escape") {
                      setIsEditingBpm(false);
                      setBpmInput(Math.round(bpm).toString());
                    }
                  }}
                  className="w-10 lg:w-12 text-center bg-black border border-emerald-400 rounded text-emerald-300 font-mono text-[10px] lg:text-xs font-bold outline-none px-0.5 tabular-nums"
                />
              ) : (
                <span
                  onClick={() => {
                    setBpmInput(Math.round(bpm).toString());
                    setIsEditingBpm(true);
                  }}
                  title="Tempo BPM (Clic para editar)"
                  className="font-mono text-[10.5px] lg:text-xs font-bold text-emerald-400 tracking-wider cursor-pointer hover:brightness-125 transition select-none drop-shadow-[0_0_6px_rgba(16,185,129,0.5)] tabular-nums"
                >
                  {Math.round(bpm)}
                </span>
              )}
              <span className="text-[8px] lg:text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-wider ml-0.5 lg:ml-1">
                BPM
              </span>
            </div>

            {/* BPM Up (+) */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "bpmUp";
              const mapped = getActionMappingLabel(midiLearnMapping, "bpmUp");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "bpmUp" });
                      return;
                    }
                    onAdjustBpm?.(1);
                  }}
                  title={isMidiLearnActive ? `Tempo +1: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}` : "Tempo +1"}
                  className={`w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded font-mono font-bold text-[11px] lg:text-xs transition cursor-pointer ${
                    isSelected
                      ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse text-amber-200"
                      : isMidiLearnActive
                      ? "border border-amber-500/60 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  +
                </button>
              );
            })()}

            {/* Tap Tempo */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "tapTempo";
              const mapped = getActionMappingLabel(midiLearnMapping, "tapTempo");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "tapTempo" });
                      return;
                    }
                    onTapTempo?.();
                  }}
                  title={isMidiLearnActive ? `Tap Tempo: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}` : "Tap Tempo"}
                  className={`px-1.5 py-0.5 lg:px-2 lg:py-1 ml-0.5 lg:ml-1 text-[8.5px] lg:text-[9.5px] font-mono font-bold uppercase tracking-wider rounded border transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-2 ring-amber-400/60 animate-pulse text-amber-200"
                      : isMidiLearnActive
                      ? "border border-amber-500/60 bg-amber-950/20 text-amber-300 hover:border-amber-400"
                      : "bg-white/[0.06] hover:bg-emerald-500 hover:text-black text-zinc-300 border-white/10"
                  }`}
                >
                  TAP
                </button>
              );
            })()}
          </div>

          {/* Cápsula Unificada de Metrónomo [ Sonoro | Visual ] */}
          <div className="flex items-stretch h-7 lg:h-8 rounded-lg bg-[#18191e] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Metrónomo Sonoro (Click) */}
            {(() => {
              const isClickSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "click";
              const clickMapped = getActionMappingLabel(midiLearnMapping, "click");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "click" });
                      return;
                    }
                    onToggleClick?.();
                  }}
                  title={
                    isMidiLearnActive
                      ? `Metrónomo Sonoro: ${clickMapped ? `Asignado (${clickMapped})` : "Sin asignar"}`
                      : isClickEnabled
                      ? "Metrónomo Sonoro: Activo"
                      : "Metrónomo Sonoro: Inactivo"
                  }
                  className={`w-7 sm:w-8 lg:w-10 h-full flex items-center justify-center gap-1 lg:gap-1.5 transition-all cursor-pointer border-r border-white/10 ${
                    isClickSelected
                      ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                      : isMidiLearnActive
                      ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40"
                      : isClickEnabled
                      ? "bg-amber-950/40 text-amber-300 shadow-[inset_0_0_8px_rgba(245,158,11,0.3)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12]"
                  }`}
                >
                  <svg
                    className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m4 20 6-16h4l6 16H4Z" />
                    <path d="M12 4v16" />
                    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
                  </svg>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                      isClickEnabled ? "bg-amber-400 shadow-[0_0_4px_#f59e0b]" : "bg-zinc-600"
                    }`}
                  />
                </button>
              );
            })()}

            {/* Metrónomo Visual (Overlay) */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "visualMetronome";
              const mapped = getActionMappingLabel(midiLearnMapping, "visualMetronome");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "visualMetronome" });
                      return;
                    }
                    handleToggleVisualMetronomeClick();
                  }}
                  title={
                    isMidiLearnActive
                      ? `Metrónomo Visual: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}`
                      : isVisualMetronomeVisible
                      ? "Metrónomo Visual: Activo"
                      : "Metrónomo Visual: Inactivo"
                  }
                  className={`w-7 sm:w-8 lg:w-10 h-full flex items-center justify-center gap-1 lg:gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                      : isMidiLearnActive
                      ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40"
                      : isVisualMetronomeVisible
                      ? "bg-emerald-950/40 text-emerald-300 shadow-[inset_0_0_8px_rgba(16,185,129,0.3)]"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12]"
                  }`}
                >
                  <Eye size={12} className="shrink-0" />
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                      isVisualMetronomeVisible
                        ? "bg-emerald-400 shadow-[0_0_4px_#10b981]"
                        : "bg-zinc-600"
                    }`}
                  />
                </button>
              );
            })()}
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

          {/* Bloque de Transporte Maestro (STOP, PLAY, REC) - Cápsula Unificada */}
          <div className="flex items-stretch h-7 lg:h-8 rounded-lg bg-[#18191e] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_4px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Stop */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "stop";
              const mapped = getActionMappingLabel(midiLearnMapping, "stop");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "stop" });
                      return;
                    }
                    onStop();
                  }}
                  title={isMidiLearnActive ? `Stop: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}` : "Stop"}
                  className={`w-7 sm:w-8 lg:w-10 h-full flex items-center justify-center transition-all cursor-pointer border-r border-white/10 ${
                    isSelected
                      ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse"
                      : isMidiLearnActive
                      ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12]"
                  }`}
                >
                  <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z" />
                  </svg>
                </button>
              );
            })()}

            {/* Play / Pause */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "play";
              const mapped = getActionMappingLabel(midiLearnMapping, "play");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "play" });
                      return;
                    }
                    onTogglePlay();
                  }}
                  title={
                    isMidiLearnActive
                      ? `Play / Pause: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}`
                      : "Play / Pause (Espacio)"
                  }
                  className={`px-2.5 sm:px-3 lg:px-4 h-full text-[9.5px] lg:text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 lg:gap-1.5 transition-all cursor-pointer border-r border-white/10 ${
                    isSelected
                      ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse font-bold"
                      : isMidiLearnActive
                      ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 font-semibold"
                      : isPlaying
                      ? "bg-gradient-to-b from-emerald-400 to-emerald-600 text-black shadow-[0_0_16px_rgba(16,185,129,0.7),inset_0_1px_0_rgba(255,255,255,0.6)] font-black"
                      : "text-zinc-200 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.12] font-bold"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                      PAUSE
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      PLAY
                    </>
                  )}
                </button>
              );
            })()}

            {/* Overdub Record */}
            {(() => {
              const isSelected =
                isMidiLearnActive &&
                selectedLearnTarget?.type === "action" &&
                selectedLearnTarget.id === "record";
              const mapped = getActionMappingLabel(midiLearnMapping, "record");
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (isMidiLearnActive) {
                      onSelectLearnTarget?.({ type: "action", id: "record" });
                      return;
                    }
                    onToggleRecord?.();
                  }}
                  title={isMidiLearnActive ? `Grabar Overdub: ${mapped ? `Asignado (${mapped})` : "Sin asignar"}` : "Grabar Overdub"}
                  className={`px-2 sm:px-2.5 lg:px-3.5 h-full text-[9.5px] lg:text-[11px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 lg:gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-950/40 text-amber-200 shadow-[inset_0_0_12px_rgba(245,158,11,0.6)] animate-pulse font-bold"
                      : isMidiLearnActive
                      ? "bg-amber-950/20 text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 font-semibold"
                      : isRecording
                      ? "bg-red-500/25 text-red-300 shadow-[inset_0_0_12px_rgba(239,68,68,0.5)] animate-pulse font-black"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] active:bg-white/[0.12] font-bold"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all shrink-0 ${
                      isRecording ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-zinc-500"
                    }`}
                  />
                  REC
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
});
